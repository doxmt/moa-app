import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type AdminClient = ReturnType<typeof createClient>;

async function deleteByUserId(
  admin: AdminClient,
  table: string,
  column: 'user_id' | 'created_by',
  userId: string,
) {
  const { error } = await admin.from(table).delete().eq(column, userId);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function removeStorageFiles(admin: AdminClient, userId: string) {
  const paths: string[] = [];

  const { data: photoRows, error: photoError } = await admin
    .from('couple_photos')
    .select('storage_path')
    .eq('user_id', userId);
  if (photoError) throw new Error(`couple_photos select: ${photoError.message}`);

  const { data: storyRows, error: storyError } = await admin
    .from('stories')
    .select('storage_path')
    .eq('created_by', userId);
  if (storyError) throw new Error(`stories select: ${storyError.message}`);

  for (const row of [...(photoRows ?? []), ...(storyRows ?? [])]) {
    if (row.storage_path) paths.push(row.storage_path);
  }

  if (paths.length === 0) return;

  const { error } = await admin.storage.from('couple-photos').remove(paths);
  if (error) throw new Error(`storage remove: ${error.message}`);
}

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

  // 커플 연결 해제 처리
  const { data: profile } = await admin
    .from('profiles')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.couple_id) {
    const coupleId = profile.couple_id;

    // 상대방 연결 해제
    await admin
      .from('profiles')
      .update({ couple_id: null })
      .eq('couple_id', coupleId)
      .neq('user_id', user.id);

    // 커플 데이터 30일 후 만료
    await admin
      .from('couples')
      .update({ expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', coupleId);
  }

  try {
    await removeStorageFiles(admin, user.id);
    await deleteByUserId(admin, 'push_tokens', 'user_id', user.id);
    await deleteByUserId(admin, 'notifications', 'user_id', user.id);
    await deleteByUserId(admin, 'game_answers', 'user_id', user.id);
    await deleteByUserId(admin, 'couple_photos', 'user_id', user.id);
    await deleteByUserId(admin, 'stories', 'created_by', user.id);
    await deleteByUserId(admin, 'calendar_events', 'created_by', user.id);
    await deleteByUserId(admin, 'profiles', 'user_id', user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'delete rows failed';
    console.error('[delete-account] cleanup error', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }

  // FK 참조를 먼저 제거한 뒤 auth 유저 삭제
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('[delete-account] auth delete error', deleteError.message);
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
