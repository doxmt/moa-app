import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type AdminClient = ReturnType<typeof createClient>;

type PushMessage = {
  to: string;
  userId: string;
  title: string;
  body: string;
  data: Record<string, string>;
};

const truncate = (s: string, max = 100) =>
  s.length > max ? s.slice(0, max - 3) + '...' : s;

async function sendExpoPushMessages(admin: AdminClient, messages: PushMessage[]) {
  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const batch = messages.slice(i, i + chunkSize);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch.map((m) => ({ to: m.to, title: m.title, body: m.body, data: m.data }))),
    });

    if (!res.ok) {
      console.error('[push] Expo API error', res.status, await res.text());
      continue;
    }

    const json = await res.json();
    const tickets: Array<{ status: string; details?: { error?: string } }> = json?.data ?? [];

    for (let j = 0; j < tickets.length; j++) {
      const ticket = tickets[j];
      if (ticket.status === 'error') {
        console.error('[push] ticket error', ticket.details);
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await admin
            .from('push_tokens')
            .delete()
            .eq('token', batch[j].to)
            .eq('user_id', batch[j].userId);
        }
      }
    }
  }
}

async function notify(admin: AdminClient, payload: {
  targetUserId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  const { targetUserId, type, title, body, data = {} } = payload;

  const { data: inserted, error: insertError } = await admin
    .from('notifications')
    .insert({ user_id: targetUserId, type, title, body, data })
    .select('id')
    .single();

  if (insertError || !inserted) {
    console.error('[notify] insert error', insertError);
    return;
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

  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    userId: targetUserId,
    title,
    body,
    data: { ...data, notificationId: inserted.id },
  }));

  await sendExpoPushMessages(admin, messages);
}

async function getPartnerUserId(
  admin: AdminClient,
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

async function getPartnerNickname(admin: AdminClient, userId: string): Promise<string> {
  const { data } = await admin
    .from('profiles')
    .select('couple_nickname, name')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.couple_nickname ?? data?.name ?? '파트너';
}

Deno.serve(async (req) => {
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
    if (!record?.id) return new Response('invalid record', { status: 400 });

    const { data: profiles, error } = await admin
      .from('profiles')
      .select('user_id')
      .not('couple_id', 'is', null);

    if (error) {
      console.error('[new_question] profiles fetch error', error);
      return new Response('error', { status: 500 });
    }

    const userIds: string[] = (profiles ?? []).map((p: { user_id: string }) => p.user_id);
    if (userIds.length === 0) return new Response('ok');

    const title = '새로운 질문이 도착했어요!';
    const body = truncate(record.question ?? '오늘의 밸런스 게임을 확인해보세요');
    const gameId = String(record.id);

    const notifRows = userIds.map((userId) => ({
      user_id: userId,
      type: 'new_question',
      title,
      body,
      data: { type: 'new_question', gameId },
    }));

    const { data: insertedNotifs, error: notifError } = await admin
      .from('notifications')
      .insert(notifRows)
      .select('id, user_id');

    if (notifError) console.error('[new_question] notification insert error', notifError);

    const notifIdMap = new Map<string, string>(
      (insertedNotifs ?? []).map((n: { id: string; user_id: string }) => [n.user_id, n.id]),
    );

    const { data: tokenRows, error: tokenError } = await admin
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    if (tokenError) {
      console.error('[new_question] token fetch error', tokenError);
      return new Response('ok');
    }

    const messages: PushMessage[] = (tokenRows ?? []).map(
      (r: { user_id: string; token: string }) => ({
        to: r.token,
        userId: r.user_id,
        title,
        body,
        data: {
          type: 'new_question',
          gameId,
          notificationId: notifIdMap.get(r.user_id) ?? '',
        },
      }),
    );

    if (messages.length > 0) await sendExpoPushMessages(admin, messages);
    return new Response('ok');
  }

  // 2. 파트너 첫 선택 → 상대방에게 발송
  if (table === 'game_answers' && type === 'INSERT') {
    if (!record?.couple_id || !record?.user_id) return new Response('invalid record', { status: 400 });

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

    if (record.reason) {
      await notify(admin, {
        targetUserId: partnerId,
        type: 'partner_reason',
        title: `${nickname}님이 의견을 남겼어요!`,
        body: truncate(record.reason),
        data: { type: 'partner_reason', gameId: String(record.game_id) },
      });
    }

    return new Response('ok');
  }

  // 3. 파트너 첫 의견 작성 → 상대방에게 발송
  if (table === 'game_answers' && type === 'UPDATE') {
    if (!record?.couple_id || !record?.user_id) return new Response('invalid record', { status: 400 });

    const hadNoReason = !old_record?.reason;
    const hasReason = !!record.reason;
    if (!hadNoReason || !hasReason) return new Response('ok');

    const partnerId = await getPartnerUserId(admin, record.couple_id, record.user_id);
    if (!partnerId) return new Response('ok');
    const nickname = await getPartnerNickname(admin, record.user_id);

    await notify(admin, {
      targetUserId: partnerId,
      type: 'partner_reason',
      title: `${nickname}님이 의견을 남겼어요!`,
      body: truncate(record.reason),
      data: { type: 'partner_reason', gameId: String(record.game_id) },
    });
    return new Response('ok');
  }

  // 4. 파트너 스토리 업로드 → 상대방에게 발송
  if (table === 'stories' && type === 'INSERT') {
    // stories 테이블은 user_id 대신 created_by 사용
    if (!record?.created_by) return new Response('invalid record', { status: 400 });

    const { data: profile } = await admin
      .from('profiles')
      .select('couple_id')
      .eq('user_id', record.created_by)
      .maybeSingle();
    if (!profile?.couple_id) return new Response('ok');

    const partnerId = await getPartnerUserId(admin, profile.couple_id, record.created_by);
    if (!partnerId) return new Response('ok');
    const nickname = await getPartnerNickname(admin, record.created_by);

    await notify(admin, {
      targetUserId: partnerId,
      type: 'story',
      title: `${nickname}님이 스토리를 올렸어요!`,
      body: '새로운 스토리를 확인해보세요 📷',
      data: { type: 'story', storyId: String(record.id) },
    });
    return new Response('ok');
  }

  return new Response('unhandled', { status: 200 });
});
