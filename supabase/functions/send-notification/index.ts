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
  const messages = tokens.map((token) => ({ to: token, title, body, data }));
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
}

async function notify(admin: ReturnType<typeof createClient>, payload: NotificationPayload) {
  const { targetUserId, type, title, body, data = {} } = payload;

  // 인앱 알림 저장
  await admin.from('notifications').insert({ user_id: targetUserId, type, title, body, data });

  // 푸시 토큰 조회 & 발송
  const { data: rows } = await admin
    .from('push_tokens')
    .select('token')
    .eq('user_id', targetUserId);

  const tokens = (rows ?? []).map((r: { token: string }) => r.token);
  if (tokens.length > 0) {
    await sendExpoPush(tokens, title, body, data);
  }
}

async function getPartnerUserId(
  admin: ReturnType<typeof createClient>,
  coupleId: string,
  excludeUserId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('user_id')
    .eq('couple_id', coupleId)
    .neq('user_id', excludeUserId)
    .maybeSingle();
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
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  if (webhookSecret) {
    const signature = req.headers.get('x-webhook-secret');
    if (signature !== webhookSecret) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const { type, table, record, old_record } = await req.json();
  const admin = createClient(supabaseUrl, serviceKey);

  // 1. 새 질문 등록 → 모든 커플 유저에게 발송
  if (table === 'balance_games' && type === 'INSERT') {
    const { data: profiles } = await admin.from('profiles').select('user_id').not('couple_id', 'is', null);
    for (const p of profiles ?? []) {
      await notify(admin, {
        targetUserId: p.user_id,
        type: 'new_question',
        title: '새로운 질문이 도착했어요!',
        body: record.question ?? '오늘의 밸런스 게임을 확인해보세요',
        data: { type: 'new_question', gameId: record.id },
      });
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
      data: { type: 'partner_answer', gameId: record.game_id },
    });
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
    await notify(admin, {
      targetUserId: partnerId,
      type: 'partner_reason',
      title: `${nickname}님이 의견을 남겼어요!`,
      body: record.reason,
      data: { type: 'partner_reason', gameId: record.game_id },
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
