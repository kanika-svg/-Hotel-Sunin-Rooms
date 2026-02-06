# Clear steps: Run the database migration in Supabase

Do this **after** you have created your Supabase project. You will paste the **SQL code** (not the file name) into the Supabase SQL Editor.

---

## Step 1: Open the migration file on your computer

1. In Cursor (or your editor), open this file from your project:
   ```
   supabase/migrations/20260206000000_initial_schema.sql
   ```
2. The file should show lines that start with `--` (comments) and `CREATE TABLE` (SQL commands).  
   **Do not** type or paste the file path anywhere. You only need the **text inside this file**.

---

## Step 2: Copy all the SQL from that file

1. Click inside the editor where the migration file is open.
2. Press **Ctrl+A** (Windows) or **Cmd+A** (Mac) to select everything in the file.
3. Press **Ctrl+C** (or **Cmd+C**) to copy.  
   Your clipboard should now contain the full SQL (comments and all `CREATE TABLE` / `CREATE INDEX` lines).

---

## Step 3: Open Supabase SQL Editor in your browser

1. Go to: **https://supabase.com/dashboard**
2. Sign in if needed.
3. Click your project (e.g. the one you linked with ref `oxxiipdkspsdeauqqoeq`).
4. In the left sidebar, click **“SQL Editor”**.
5. Click **“New query”** (or the **+** to create a new query).  
   You should see a big empty text box. This is where the SQL will go.

---

## Step 4: Paste the SQL and run it

1. Click inside the **big text box** in the SQL Editor (so the cursor is there).
2. If there is any text already (e.g. a file path or sample query), **delete it all** so the box is empty.
3. Press **Ctrl+V** (or **Cmd+V**) to paste.  
   You should see the same SQL as in your file: lines starting with `-- Hotel Sunin Rooms`, then `CREATE TABLE IF NOT EXISTS rooms`, etc.
4. Click the green **“Run”** button (or press **Ctrl+Enter**).
5. Wait a few seconds. You should see a message like **“Success. No rows returned.”**  
   If you see a red error, check that you pasted the **contents of the file**, not the file path.

---

## Step 5: Confirm the tables exist (optional)

1. In the Supabase left sidebar, click **“Table Editor”**.
2. You should see tables: **rooms**, **bookings**, **settings**, **users**.  
   That means the migration ran correctly.

---

## What NOT to do

- **Do not** type or paste the **file path** (e.g. `supabase/migrations/20260206000000_initial_schema.sql`) into the SQL Editor. The database will try to run it as SQL and show a syntax error.
- **Do not** run only one line. You must run the **entire** contents of the migration file (all `CREATE TABLE` and `CREATE INDEX` statements).

---

## If you see an error

- **“syntax error at or near …”**  
  You probably pasted the file path or something that isn’t SQL. Clear the editor, open the migration file again, select all (Ctrl+A), copy (Ctrl+C), paste (Ctrl+V) into the SQL Editor, then Run.
- **“relation already exists”**  
  The migration (or part of it) was already run. You can leave it as is, or run the migration on a new project.
