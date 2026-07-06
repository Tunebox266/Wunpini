import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ADMIN_JWT_SECRET = Deno.env.get('ADMIN_JWT_SECRET') || 'change-me';

async function authCheck(req){
  const h = req.headers.get('authorization') || '';
  if(!h.startsWith('Bearer ')) return null;
  const token = h.split(' ')[1];
  try{
    const payload = await verify(token, ADMIN_JWT_SECRET, 'HS256');
    if(payload && payload.is_admin) return payload;
  }catch(e){
    console.warn('auth verify failed', e.message);
  }
  return null;
}

export default async (req: Request) => {
  const admin = await authCheck(req);
  if(!admin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status:401, headers:{'Content-Type':'application/json'} });

  const urlBase = `${SUPABASE_URL}/rest/v1/orders`;
  const headers = { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' };

  try{
    if(req.method === 'GET'){
      const res = await fetch(`${urlBase}?select=*,order_items(*)&order=created_at.desc&limit=100`, { headers });
      const data = await res.json();
      return new Response(JSON.stringify(data), { status:200, headers:{'Content-Type':'application/json'} });
    }
    return new Response('Method not allowed', { status:405 });
  }catch(err){
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status:500, headers:{'Content-Type':'application/json'} });
  }
}
