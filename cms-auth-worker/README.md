# Simorchip CMS Auth Worker

A small Cloudflare Worker that lets the `/admin` CMS (Sveltia CMS) log editors
in with their GitHub account, so the GitHub commit history records who changed
what.

This folder is **not** part of the static site — it is a separate Cloudflare
Worker, deployed independently from the Pages project.

## One-time setup

1. **Create a GitHub OAuth App**
   - GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: `https://simorchip-docs.pages.dev`
   - Authorization callback URL: `https://<your-worker-subdomain>.workers.dev/callback`
     (you'll get the exact Worker URL after the first deploy — you can update
     the callback URL afterwards)

2. **Login to Cloudflare from the CLI**
   ```sh
   cd cms-auth-worker
   npx wrangler login
   ```

3. **Set the OAuth app secrets**
   ```sh
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```

4. **Deploy**
   ```sh
   npx wrangler deploy
   ```
   Note the deployed Worker URL (e.g. `https://simorchip-cms-auth.<account>.workers.dev`).

5. **Wire it up**
   - Go back to the GitHub OAuth App and set the callback URL to
     `<worker-url>/callback`
   - In `src/admin/config.yml`, set `backend.base_url` to the Worker URL
     (replace `https://REPLACE-WITH-OAUTH-WORKER-URL.workers.dev`)
   - Commit and push — Cloudflare Pages will redeploy `/admin` with the
     updated config

## Access control

Only GitHub accounts with **write (or admin) access** to the
`Boyfriendishere/simorchip-docs` repo can log in and save changes — GitHub's
own collaborator permissions are the CMS roles, and every save shows up as a
commit authored by that person.
