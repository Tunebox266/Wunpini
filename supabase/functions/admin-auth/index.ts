import { create, getNumericDate, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@0.4.1/mod.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ADMIN_JWT_SECRET = Deno.env.get('ADMIN_JWT_SECRET') || 'change-me';

if(!SUPABASE_URL || !SERVICE_ROLE){
  console.warn('SUPABASE_URL or SERVICE_ROLE not set; function will not be able to query database');
}

export default async (req: Request) => {
  try{
    if(req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const body = await req.json();
    const email = (body.email || '').trim();
    const password = body.password || '';
    if(!email || !password) return new Response(JSON.stringify({ error: 'Email and password required' }), { status:400, headers:{'Content-Type':'application/json'} });

    // Query admins table via Supabase REST
    const url = `${SUPABASE_URL}/rest/v1/admins?select=id,email,password_hash&email=eq.${encodeURIComponent(email)}`;
    const res = await fetch(url, { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
    if(!res.ok) return new Response(JSON.stringify({ error: 'Error querying admins' }), { status:500, headers:{'Content-Type':'application/json'} });
    const rows = await res.json();
    const admin = rows && rows[0];
    if(!admin) return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status:401, headers:{'Content-Type':'application/json'} });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if(!valid) return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status:401, headers:{'Content-Type':'application/json'} });

    // Create JWT
    const payload = {
      admin_id: admin.id,
      email: admin.email,
      is_admin: true,
      exp: getNumericDate(60 * 60) // 1 hour
    };
    const header = { alg: 'HS256', typ: 'JWT' };
    const token = await create(header, payload, ADMIN_JWT_SECRET);
    return new Response(JSON.stringify({ token }), { status:200, headers:{'Content-Type':'application/json'} });
  }catch(err){
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status:500, headers:{'Content-Type':'application/json'} });
  }
}
