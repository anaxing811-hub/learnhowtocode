# Deploying to Vercel

Two things make this deployment slightly unusual, and both are handled for you
in `next.config.ts` — but they are worth understanding before you click deploy.

1. **The site must send cross-origin isolation headers.** The C++ compiler and
   the Python interpreter run as WebAssembly in Web Workers and need
   `SharedArrayBuffer`, which browsers only expose to cross-origin-isolated
   pages. Without the headers the runners will not start.
2. **The toolchains are ~100 MB of static assets.** They are not committed to
   git. `npm install` brings them in via `node_modules`, and the `prebuild`
   script copies them into `public/` on every build.

---

## 1. Push the branch (already done)

The code lives on `claude/multi-lang-learning-app-m8l2f9`. Merge it to `main`
first if you want production deploys from `main`:

```bash
git checkout main
git merge claude/multi-lang-learning-app-m8l2f9
git push origin main
```

Or skip this and deploy the branch directly — Vercel is happy either way.

## 2. Import the project

1. Go to <https://vercel.com/new>.
2. Click **Import Git Repository** and pick `anaxing811-hub/learnhowtocode`.
   (If you do not see it, click **Adjust GitHub App Permissions** and grant
   access to the repo.)
3. Vercel detects Next.js on its own. **Leave every build setting at its
   default.** In particular:
   - Framework Preset: `Next.js`
   - Build Command: leave blank (Vercel runs `npm run build`, which triggers
     `prebuild` and copies the toolchains)
   - Output Directory: leave blank
   - Install Command: leave blank
4. Click **Deploy**.

The first build takes noticeably longer than a typical Next.js site — it is
copying ~100 MB of WebAssembly into the output. Three to five minutes is
normal.

## 3. Check it worked

Open the deployment and go to any C++ lesson, then:

- Press **Run** on the first code block. The first compile downloads roughly
  45 MB of toolchain and takes 30–90 seconds. Every compile after that is a
  few seconds, and the assets are cached for a year.
- If the Run button never appears, you are on a narrow screen or a touch
  device — that is deliberate (see "Mobile" below).
- If you get an error mentioning `SharedArrayBuffer` or cross-origin
  isolation, the headers are not being applied. Confirm with:

  ```bash
  curl -sI https://your-app.vercel.app | grep -i cross-origin
  ```

  You should see both `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp`.

---

## Deployment size

The build output includes about 100 MB of static WebAssembly. That is fine on
Vercel's Hobby plan, but if you ever hit a size limit, `scripts/prepare-assets.mjs`
has an `EMCEPTION_SKIP` list of bundles that are pruned. It is already pruning
~40 MB of things no lesson uses (the Python-based emcc driver, raylib, CMake,
sanitizer runtimes).

**Do not prune by guesswork.** Run the verifier after any change to that list:

```bash
npm run build
npx next start -p 3100 &
npm run verify http://127.0.0.1:3100
```

It fails the run if any asset 404s. `sdl3.tar.br` looks unnecessary and is not —
that was found this way rather than by reasoning about it.

---

## Optional: progress sync with Supabase

Without this, progress is saved in each browser's localStorage and the
dashboard offers an export/import file to move it between devices. Everything
works; it just does not sync automatically.

To turn on accounts and sync:

1. Create a free project at <https://supabase.com/dashboard>.
2. Open **SQL Editor → New query**, paste the entire contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   and run it. It creates four tables, all protected by row level security so
   one account can never read another's rows.
3. In Supabase, go to **Project Settings → API** and copy:
   - the **Project URL**
   - the **anon / public** key (this one is safe in a browser; the
     `service_role` key is not — never put that in a `NEXT_PUBLIC_` variable)
4. In Vercel, go to **Settings → Environment Variables** and add both:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key |

5. Redeploy. The **Progress** page will now offer a magic-link sign-in instead
   of the "sync is not configured" notice.

Sign-in uses a magic link, so also check **Authentication → URL Configuration**
in Supabase and add your Vercel domain to the redirect allow-list.

---

## Optional: fully self-hosted Python packages

By default, NumPy / pandas / Matplotlib / scikit-learn wheels are fetched from
the official Pyodide CDN the first time a lesson imports them. The Python
*interpreter* is always served from your own domain.

If you would rather serve the wheels yourself too — for offline use, or to
avoid the CDN entirely — set the environment variable
`NEXT_PUBLIC_PYODIDE_PACKAGE_URL=/pyodide/` and place the matching wheels in
`public/pyodide/`. They are in the Pyodide release tarball for the exact
version pinned in `package.json` (currently 314.0.3):
<https://github.com/pyodide/pyodide/releases>.

---

## Mobile

The site is responsive and reads well on a phone. The code runners deliberately
do **not** activate on narrow screens or touch-primary devices: they would ask
the browser to download tens of megabytes of compiler. Lessons show their code
read-only there, with a note explaining why.

That behaviour lives in `src/hooks/use-media-query.ts` (`useCanRunCode`) if you
ever want to change it.

---

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

`predev` and `prebuild` both run `scripts/prepare-assets.mjs`, so the
toolchains are copied into `public/` automatically.

Useful scripts:

| Command | What it does |
| --- | --- |
| `npm run check:content` | Compiles every MDX file and validates frontmatter. Fast — run it after editing lessons. |
| `npm run problems` | Regenerates problem test data from the reference solutions in `scripts/generate-problems.mjs`. |
| `npm run verify` | Drives the built site in real Chromium and checks every runtime. |
| `npm run typecheck` | `tsc --noEmit` over the web app. |
| `npm run assets` | Re-copies the toolchains into `public/`. |
