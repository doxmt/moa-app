import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (!user || userError) return new Response('Unauthorized', { status: 401 });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 커플 연결 해제 처리 (상대방도 강제 해제)
  const { data: profile } = await admin
    .from('profiles')
    .select('couple_id')
    .eq('user_id', user.id)
    .single();

  if (profile?.couple_id) {
    const coupleId = profile.couple_id;

    // 나 + 상대방 모두 couple_id 해제
    await admin
      .from('profiles')
      .update({ couple_id: null })
      .eq('couple_id', coupleId);

    // 커플 데이터 30일 후 만료
    await admin
      .from('couples')
      .update({ expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', coupleId);
  }

  // auth 유저 삭제 (profiles FK cascade로 함께 삭제)
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
