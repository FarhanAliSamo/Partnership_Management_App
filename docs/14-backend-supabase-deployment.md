# 14 — Supabase Setup + Live Guide (Step-by-Step)

Follow this in order. You'll need: a browser (Supabase), and this project folder open.

---

## STEP 1 — Get your Supabase URL and anon key

1. Open **https://supabase.com** and log in.
2. You already created an account — now there should be a project (or create one with **New project**).
3. Once inside your project, look at the **left sidebar**.
4. Click **"Project Settings"** (it is the gear ⚙️ icon at the very bottom of the left sidebar).
5. In the Project Settings page, click **"API"** (under the "Configuration" section).
6. On the API page you will see:
   - **Project URL** → looks like `https://abcdxyz123.supabase.co`
   - **Project API keys** → `anon` `public` key (long string starting with `eyJ...`)
7. **Copy both** of those values (URL and the `anon public` key). Keep this tab open.

> The "anon" key is the public key. That is exactly the `EXPO_PUBLIC_SUPABASE_ANON_KEY` we need.
> (The `service_role` key is secret — do NOT put that in the app.)

---

## STEP 2 — Create the database tables (run our SQL)

1. In the Supabase **left sidebar**, click **"SQL Editor"**.
2. Click **"New query"** (or "+" if present).
3. On your computer, open the file:
   ```
   supabase/schema.sql
   ```
   (this file is in your project folder `F CRM/supabase/schema.sql`)
4. Select everything in that file (Cmd/Ctrl + A), copy it (Cmd/Ctrl + C).
5. Paste it into the Supabase SQL Editor.
6. Click **"Run"** (or press Ctrl/Cmd + Enter).
7. You should see **"Success. No rows returned"** (or similar). That means all tables + security policies are created.

> Verify later: left sidebar → **"Table Editor"** → you should see tables like `earnings`, `expenses`, `loans`, `monthly_settlements`, etc.

---

## STEP 3 — Put the keys into your project (.env)

1. In your project folder (`F CRM`), create a new file named exactly:
   ```
   .env
   ```
   (not `.env.txt`, not `.env.example` — just `.env`)
2. Open that `.env` file and paste exactly this (replace the placeholder values with your real values from Step 1):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcdxyz123.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi... (your anon public key)
   ```

   - `EXPO_PUBLIC_SUPABASE_URL` = your **Project URL** (Step 1)
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = your **anon public** key (Step 1)

   There must be **no quotes** around the values, and no spaces around the `=`.
3. Save the file.

> Already have `.env.example` in the project. You can copy it to `.env` and just replace the two placeholder lines.

---

## STEP 4 — Restart the app so it reads the .env

1. Stop the running Expo server (if any): press **Ctrl + C** in the terminal.
2. Start it again:
   ```
   npm start
   ```
   (or `npx expo start`)
3. The `.env` values are read at **build/start time**, so a restart is required.

> IMPORTANT: `.env` (with your real keys) should NOT be committed to git. It is already safe by default because our `.gitignore` typically excludes `.env`. If you later use EAS build, set the keys with `eas secret:create` instead.

---

## STEP 5 — Build APK / go live (Android)

You can test in Expo Go / dev build first. To produce a real installable APK:

```
npm i -g eas-cli      # only once
eas login             # log in with your Expo account
eas build -p android --profile preview     # creates an APK (easy to install)
eas build -p android --profile production  # creates an AAB for Play Store
```

- EAS will give you a download link for the APK.
- For Play Store: go to Google Play Console → create app → upload the AAB → submit.

---

## What happens after this

- App still works **offline** (SQLite on the phone).
- When online, every new/edited Earning, Expense, Loan, Settlement, etc. is automatically pushed to Supabase PostgreSQL.
- Dashboard shows `☁ Synced` (green) when all pushed, or `☁ N pending` (orange) if offline.

---

## Quick reference (paths)

| What | Where to click in Supabase |
|------|----------------------------|
| Project URL + anon key | Left sidebar ⚙️ **Project Settings → API** |
| Run SQL tables | Left sidebar **SQL Editor** |
| See created tables/data | Left sidebar **Table Editor** |
| Photo storage (optional) | Left sidebar **Storage** → new bucket `attachments` |