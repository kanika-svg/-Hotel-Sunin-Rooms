# Supabase setup checklist (do this to stop using Render)

Follow these steps in order. Steps 1–3 can be done in the Supabase dashboard without installing the CLI.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → choose org, name, database password, region.
3. After it’s created, open **Project Settings** → **API** and note:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **Project ref** is the part before `.supabase.co` (e.g. `abcdefgh`).

---

## 2. Run the database migration

**Detailed steps:** See **RUN-MIGRATION-STEPS.md** in this repo for clear, step-by-step instructions.

**Short version:**
1. Open the file `supabase/migrations/20260206000000_initial_schema.sql` in your editor.
2. Select all (Ctrl+A) and copy (Ctrl+C) — you need the **SQL text**, not the file path.
3. In Supabase dashboard: **SQL Editor** → **New query**.
4. Clear any existing text, paste (Ctrl+V) the SQL, then click **Run**.
5. You should see “Success. No rows returned.”

---

## 3. Deploy the Edge Function and set the secret

Use the **Supabase CLI from this project** (global install is not supported). Run all commands from the **repo root** (`Hotel-Sunin-Rooms`) with `npx supabase`.

**If you don’t have the CLI in the project yet:**  
`npm i supabase --save-dev`

Then in a terminal, from the repo root:

```powershell
# Log in (opens browser)
npx supabase login

# Link to your project (use your project ref from step 1)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the API function (no Supabase JWT verification; we use custom JWT)
npx supabase functions deploy api --no-verify-jwt

# Set the JWT secret (use the value below exactly once, then keep it private)
npx supabase secrets set JWT_SECRET=uj4x5VmZ+/bZsHlHm0HBp5Wo900iZsZwGiMgpEV4Rhs=
```

Replace `YOUR_PROJECT_REF` with your actual project ref (e.g. `abcdefgh`).

**Alternative (Windows):** You can install the CLI via [Scoop](https://scoop.sh):  
`Scoop bucket add supabase https://github.com/supabase/scoop-bucket.git` then `scoop install supabase`. Then you can use `supabase` instead of `npx supabase`.

**Important:** The `JWT_SECRET` above was generated for this setup. Use it only for this app and don’t commit it anywhere else. If you prefer your own secret, generate one and use it in the last command instead.

---

## 4. Set Netlify env

1. Netlify dashboard → your site → **Site configuration** → **Environment variables**.
2. Add (or update):
   - **Key:** `VITE_API_URL`
   - **Value:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/api`  
     (no trailing slash; replace `YOUR_PROJECT_REF` with your Supabase project ref.)
3. Save and **trigger a new deploy** so the frontend picks up the new API URL.

---

## 5. (Optional) Stop using Render

- In the Render dashboard you can delete or suspend the backend service for this app.
- The app will use only Supabase (DB + Edge Function) and Netlify (frontend).

---

## Quick reference

| Step | What |
|------|------|
| 1 | Create Supabase project, note **project ref** |
| 2 | SQL Editor → paste `supabase/migrations/20260206000000_initial_schema.sql` → Run |
| 3 | CLI: `npx supabase login` → `npx supabase link` → `npx supabase functions deploy api --no-verify-jwt` → `npx supabase secrets set JWT_SECRET=...` |
| 4 | Netlify: `VITE_API_URL` = `https://<project-ref>.supabase.co/functions/v1/api`, redeploy |
| 5 | Optionally remove backend from Render |

After step 4, open your Netlify site and run through **Setup** (create first user) if the DB was empty; the function will seed rooms when there are none.
