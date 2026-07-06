# Supabase Edge Functions for Wunpini Admin

This folder contains three Supabase Edge Functions implemented in Deno:

- admin-auth: POST / - accepts { email, password } and returns a signed JWT if credentials match an entry in the admins table. Uses SERVICE_ROLE to fetch admin row and bcrypt to verify password hash.
- admin-menu: protected CRUD endpoint for menu_items. Accepts GET/POST/PATCH/DELETE and forwards requests to Supabase REST using SERVICE_ROLE.
- admin-orders: protected GET endpoint to list recent orders and order_items.

Environment variables required (set these in your Supabase Functions settings):
- SUPABASE_URL: https://<project>.supabase.co
- SUPABASE_SERVICE_ROLE_KEY: Supabase service_role key (keep secret)
- ADMIN_JWT_SECRET: a long random secret used to sign admin JWTs

Deploying:
1. Install the Supabase CLI and log in. See https://supabase.com/docs/guides/functions
2. From this repo, run `supabase functions deploy admin-auth --project-ref <ref>` (and similarly for admin-menu and admin-orders).
3. Configure environment variables in the Supabase dashboard for each function.

Notes:
- The JWT created by admin-auth is HMAC-SHA256 signed and valid for 1 hour. The admin UI stores it in localStorage and sends it as Authorization: Bearer <token>.
- All protected functions verify that the token has `is_admin: true`.
- These functions use the Supabase REST API and the service_role key to perform DB operations server-side.

Security:
- Keep SERVICE_ROLE and ADMIN_JWT_SECRET private; do not expose them in the client.
- Consider rotating ADMIN_JWT_SECRET regularly and implementing refresh tokens if you need long-lived sessions.
- For production, you may want to integrate Supabase Auth and manage admin users there; these functions are a light-weight server-side auth alternative.
