// Server-side account management. Uses the SECRET service key (set in Vercel only, never in GitHub).
const U = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const A = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const S = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FEE = 30000;
const H = (k) => ({ apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' });
const prof = async (id) => (await (await fetch(`${U}/rest/v1/profiles?id=eq.${id}&select=*`, { headers: H(S) })).json())[0];
const patch = (id, o) => fetch(`${U}/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', headers: H(S), body: JSON.stringify(o) });
const clamp = (n) => Math.max(0, Math.min(FEE, Number(n) || 0));

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    if (!S) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set in Vercel' });
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const ur = await fetch(`${U}/auth/v1/user`, { headers: { apikey: A, Authorization: 'Bearer ' + token } });
    if (!ur.ok) return res.status(401).json({ error: 'Please sign in again' });
    const me = await prof((await ur.json()).id);
    if (!me || me.suspended) return res.status(403).json({ error: 'Not allowed' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const admin = me.role === 'admin';
    const owner = me.role === 'landlord' && me.system_fee_paid >= FEE;

    if (b.action === 'create') {
      const role = admin ? 'landlord' : owner && ['tenant', 'assistant'].includes(b.role) ? b.role : null;
      if (!role) return res.status(403).json({ error: 'Not allowed' });
      if (!/^\S+@\S+\.\S+$/.test(b.email || '') || (b.password || '').length < 8)
        return res.status(400).json({ error: 'Enter a valid email and a password of 8+ characters' });
      const c = await fetch(`${U}/auth/v1/admin/users`, {
        method: 'POST', headers: H(S),
        body: JSON.stringify({ email: b.email, password: b.password, email_confirm: true,
          user_metadata: { full_name: String(b.full_name || '').slice(0, 100), phone: String(b.phone || '').slice(0, 20), role } })
      });
      const u = await c.json();
      if (!c.ok) return res.status(400).json({ error: u.msg || u.message || 'Could not create the login' });
      await patch(u.id, admin ? { role, system_fee_paid: clamp(b.fee) } : { role, parent_id: me.id });
      return res.json({ ok: true });
    }

    const t = b.id ? await prof(b.id) : null;
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (b.action === 'fee' && admin && t.role === 'landlord') { await patch(t.id, { system_fee_paid: clamp(b.amount) }); return res.json({ ok: true }); }
    if (b.action === 'suspend' && admin && t.role === 'landlord') { await patch(t.id, { suspended: !!b.value }); return res.json({ ok: true }); }
    if (b.action === 'super' && me.role === 'landlord' && t.parent_id === me.id && t.role === 'assistant') { await patch(t.id, { super_user: !!b.value }); return res.json({ ok: true }); }
    return res.status(403).json({ error: 'Not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
};
