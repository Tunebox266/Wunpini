Supabase Functions / Server-side Admin Auth

What I added

- supabase/functions/admin-auth/index.ts  -> Deno Edge Function: verifies credentials against admins table and returns a short-lived JWT.
- supabase/functions/admin-menu/index.ts  -> Deno Edge Function: protected CRUD for menu_items using SUPABASE service_role key.
- supabase/functions/admin-orders/index.ts -> Deno Edge Function: protected GET for orders including order_items.
- supabase/functions/README.md            -> Deployment & env var notes.
- assets/admin.js                          -> Updated admin client to use ADMIN_API_BASE (window.ADMIN_API_BASE) and the admin function endpoints.

How to deploy

1) Install Supabase CLI and authenticate (https://supabase.com/docs/guides/cli)
2) From this repository root, deploy functions, e.g.:
   supabase functions deploy admin-auth --project-ref <your-ref>
   supabase functions deploy admin-menu --project-ref <your-ref>
   supabase functions deploy admin-orders --project-ref <your-ref>
3) In Supabase dashboard, configure function environment variables:
   SUPABASE_URL = https://<project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = <your service_role_key>
   ADMIN_JWT_SECRET = <long-random-secret>
4) Set window.ADMIN_API_BASE in the browser (or add a small script in admin.html):
   window.ADMIN_API_BASE = 'https://<region>-<project>.functions.supabase.co';

Usage from the client

- Login: POST to ${ADMIN_API_BASE}/admin-auth with { email, password } -> receives { token }
- Use token in Authorization: Bearer <token> to call /admin-menu and /admin-orders endpoints.

Security notes

- The functions use the SUPABASE service_role key server-side to perform DB operations. Keep it secret.
- ADMIN_JWT_SECRET must be kept private and long enough.

