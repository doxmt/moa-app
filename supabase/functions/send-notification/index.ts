import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type NotificationPayload = {
  targetUserId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

async function sendExpoPush(tokens: string[], title: string, body: string, data: Record<string, string>) {
  const chunk = (arr: string[], size: number) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

  const invalidTokens: string[] = [];

  for (const batch of chunk(tokens, 100)) {
    const messages = batch.map((token) => ({ to: token, title, body, data }));
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error('[push] Expo API error', res.status, await res.text());
      continue;
    }

    const json = await res.json();
    const tickets: Array<{ status: string; details?: { error?: string } }> = json?.data ?? [];
    tickets.forEach((ticket, i) => {
      if (ticket.status === 'error') {
        console.error('[push] ticket error', ticket.details);
        if (ticket.details?.error === 'DeviceNotRegistered') {
          invalidTokens.push(batch[i]);
        }
      }
    });
  }

  return invalidTokens;
}

async function notify(admin: ReturnType<typeof createClient>, payload: NotificationPayload) {
  const { targetUserId, type, title, body, data = {} } = payload;

  const { error: insertError } = await admin
    .from('notifications')
    .insert({ user_id: targetUserId, type, title, body, data });

  if (insertError) {
    console.error('[notify] insert error', insertError);
  }

  const { data: rows, error: tokenError } = await admin
    .from('push_tokens')
    .select('token')
    .eq('user_id', targetUserId);

  if (tokenError) {
    console.error('[notify] token fetch error', tokenError);
    return;
  }

  const tokens = (rows ?? []).map((r: { token: string }) => r.token);
  if (tokens.length === 0) return;

  const invalidTokens = await sendExpoPush(tokens, title, body, data);

  if (invalidTokens.length > 0) {
    await admin.from('push_tokens').delete().in('token', invalidTokens);
  }
}

async function getPartnerUserId(
  admin: ReturnType<typeof createClient>,
  coupleId: string,
  excludeUserId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('profiles')
    .select('user_id')
    .eq('couple_id', coupleId)
    .neq('user_id', excludeUserId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getPartner] error', error);
    return null;
  }
  return data?.user_id ?? null;
}

async function getPartnerNickname(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data } = await admin
    .from('profiles')
    .select('couple_nickname, name')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.couple_nickname ?? data?.name ?? '파트너';
}

Deno.serve(async (req) => {
  // fail-closed: 시크릿 미설정 시 요청 거부
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('[auth] WEBHOOK_SECRET not configured');
    return new Response('Server misconfigured', { status: 500 });
  }
  const signature = req.headers.get('x-webhook-secret');
  if (signature !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { type, table, record, old_record } = await req.json();
  const admin = createClient(supabaseUrl, serviceKey);

  // 1. 새 질문 등록 → 모든 커플 유저에게 batch 발송
  if (table === 'balance_games' && type === 'INSERT') {
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('user_id')
      .not('couple_id', 'is', null);

    if (error) {
      console.error('[new_question] profiles fetch error', error);
      return new Response('error', { status: 500 });
    }

    const userIds = (profiles ?? []).map((p: { user_id: string }) => p.user_id);
    if (userIds.length === 0) return new Response('ok');

    const title = '새로운 질문이 도착했어요!';
    const body: string = record.question ?? '오늘의 밸런스 게임을 확인해보세요';
    const truncatedBody = body.length > 100 ? body.slice(0, 97) + '...' : body;

    // notifications batch insert
    const notifRows = userIds.map((userId: string) => ({
      user_id: userId,
      type: 'new_question',
      title,
      body: truncatedBody,
      data: { type: 'new_question', gameId: String(record.id) },
    }));
    const { error: notifError } = await admin.from('notifications').insert(notifRows);
    if (notifError) console.error('[new_question] notification insert error', notifError);

    // push tokens batch 조회
    const { data: tokenRows, error: tokenError } = await admin
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    if (tokenError) {
      console.error('[new_question] token fetch error', tokenError);
      return new Response('ok');
    }

    const allTokens = (tokenRows ?? []).map((r: { token: string }) => r.token);
    if (allTokens.length > 0) {
      const invalidTokens = await sendExpoPush(allTokens, title, truncatedBody, {
        type: 'new_question',
        gameId: String(record.id),
      });
      if (invalidTokens.length > 0) {
        await admin.from('push_tokens').delete().in('token', invalidTokens);
      }
    }

    return new Response('ok');
  }

  // 2. 파트너 첫 선택 → 상대방에게 발송
  if (table === 'game_answers' && type === 'INSERT') {
    const partnerId = await getPartnerUserId(admin, record.couple_id, record.user_id);
    if (!partnerId) return new Response('ok');
    const nickname = await getPartnerNickname(admin, record.user_id);
    await notify(admin, {
      targetUserId: partnerId,
      type: 'partner_answer',
      title: `${nickname}님이 답했어요!`,
      body: '오늘의 밸런스 게임에서 선택지를 골랐어요',
      data: { type: 'partner_answer', gameId: String(record.game_id) },
    });

    // INSERT 시 이미 reason이 있으면 의견 알림도 발송
    if (record.reason) {
      const truncated = record.reason.length > 100 ? record.reason.slice(0, 97) + '...' : record.reason;
      await notify(admin, {
        targetUserId: partnerId,
        type: 'partner_reason',
        title: `${nickname}님이 의견을 남겼어요!`,
        body: truncated,
        data: { type: 'partner_reason', gameId: String(record.game_id) },
      });
    }

    return new Response('ok');
  }

  // 3. 파트너 첫 의견 작성 → 상대방에게 발송
  if (table === 'game_answers' && type === 'UPDATE') {
    const hadNoReason = !old_record?.reason;
    const hasReason = !!record.reason;
    if (!hadNoReason || !hasReason) return new Response('ok');

    const partnerId = await getPartnerUserId(admin, record.couple_id, record.user_id);
    if (!partnerId) return new Response('ok');
    const nickname = await getPartnerNickname(admin, record.user_id);
    const truncated = record.reason.length > 100 ? record.reason.slice(0, 97) + '...' : record.reason;
    await notify(admin, {
      targetUserId: partnerId,
      type: 'partner_reason',
      title: `${nickname}님이 의견을 남겼어요!`,
      body: truncated,
      data: { type: 'partner_reason', gameId: String(record.game_id) },
    });
    return new Response('ok');
  }

  // 4. 파트너 스토리 업로드 → 상대방에게 발송
  if (table === 'stories' && type === 'INSERT') {
    const { data: profile } = await admin
      .from('profiles')
      .select('couple_id')
      .eq('user_id', record.user_id)
      .maybeSingle();
    if (!profile?.couple_id) return new Response('ok');

    const partnerId = await getPartnerUserId(admin, profile.couple_id, record.user_id);
    if (!partnerId) return new Response('ok');
    const nickname = await getPartnerNickname(admin, record.user_id);
    await notify(admin, {
      targetUserId: partnerId,
      type: 'story',
      title: `${nickname}님이 스토리를 올렸어요!`,
      body: '새로운 스토리를 확인해보세요 📷',
      data: { type: 'story' },
    });
    return new Response('ok');
  }

  return new Response('unhandled', { status: 200 });
});
