# Supabase backend (Hotel Sunin Rooms)

The API runs as a single Edge Function. No Render needed.

## 1. Create a Supabase project

- Go to [supabase.com](https://supabase.com) and create a project.
- Note your **Project URL** and **service_role** key (Project Settings > API).

## 2. Run the database migration

In the Supabase dashboard: **SQL Editor** > New query > paste the contents of `migrations/20260206000000_initial_schema.sql` > Run.

Or with Supabase CLI: `supabase db push` (from repo root).

## 3. Deploy the Edge Function

```bash
supabase functions deploy api --no-verify-jwt
```

Set the JWT secret (for custom auth tokens):

```bash
supabase secrets set JWT_SECRET=your-long-random-secret
```

## 4. Frontend (Netlify) env

Set:

- `VITE_API_URL` = `https://<your-project-ref>.supabase.co/functions/v1/api`

No trailing slash.

## 5. CORS

The function allows `*` origin. For production you can restrict to your Netlify domain by setting an env or editing the `corsHeaders` in `functions/api/index.ts`.
