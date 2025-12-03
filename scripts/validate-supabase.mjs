import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const EMAIL = 'fastsavorys@supabase.com';
const PASS = 'jerosafast';

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE envs');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  // sign-in
  let { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (signInErr) {
    // try signup then signin
    await supabase.auth.signUp({ email: EMAIL, password: PASS }).catch(() => {});
    ({ data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASS }));
  }
  if (signInErr) {
    console.error('Auth failed:', signInErr.message);
    process.exit(2);
  }
  const user = signInData.user;
  console.log('Signed in as', user?.id);

  const id = uuidv4();
  const now = new Date().toISOString();
  const payload = {
    id,
    user_id: user.id,
    type: 'income',
    date: now.slice(0,10),
    time: now.slice(11,16),
    datetime: now,
    description: 'Policy test',
    category: 'test',
    amount_cents: 123,
    source_device: 'cli',
    version: 1,
    updated_at: now,
    deleted_at: null,
  };

  // insert (upsert) and then select
  const { error: upsertErr } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' });
  if (upsertErr) {
    console.error('Upsert error:', upsertErr.message);
    process.exit(3);
  }
  console.log('Upsert ok');

  const { data: got, error: selErr } = await supabase.from('transactions').select('*').eq('id', id).single();
  if (selErr) {
    console.error('Select error:', selErr.message);
    process.exit(4);
  }
  console.log('Select ok amount_cents=', got.amount_cents);

  const { error: updErr } = await supabase.from('transactions').update({ amount_cents: 456, updated_at: new Date().toISOString() }).eq('id', id);
  if (updErr) {
    console.error('Update error:', updErr.message);
    process.exit(5);
  }
  console.log('Update ok');

  // optional cleanup comment out if desired
  // await supabase.from('transactions').delete().eq('id', id);
  // console.log('Cleanup ok');
}

main().catch(e => { console.error(e); process.exit(10); });
