Admin integration notes

Files added:
- admin.html        -> Admin dashboard (UI + login box). Place at /admin.html
- assets/admin.js   -> Client-side logic that supports localStorage dev mode and Supabase when configured.
- sql/schema.sql    -> Postgres schema for Supabase including admins, menu, orders, testimonials and a role.

How to use:
1) Local development (no Supabase):
   - Open admin.html in the browser.
   - Click "Seed sample data" in the Admin login card to create a dev admin (admin@example.com / admin).
   - Sign in with the credentials and manage local menu/orders stored in localStorage.

2) Supabase integration (recommended):
   - Create a Supabase project and run sql/schema.sql in the SQL editor to create tables.
   - Create a secure admin in the admins table; store bcrypt hashes for passwords.
   - In the browser console (or by adding script to the page), set:
       window.SUPABASE_URL = 'https://your-project.supabase.co'
       window.SUPABASE_ANON_KEY = 'public-anon-key'
   - Reload admin.html and sign in. The script will use Supabase if configured.

Security notes:
- The current admin.html uses a development fallback (localStorage) if Supabase is not configured. This is for convenience only and is NOT secure. When you connect Supabase, you should use Supabase Auth for admin authentication or implement server-side verification.
- Replace the placeholder bcrypt hash in sql/schema.sql with a real hash before production.

Next steps I can do for you:
- Wire up server-side endpoints (Edge functions) for secure admin authentication if you want me to implement password checks server-side.
- Add password reset flow and audit logs for admin actions.
