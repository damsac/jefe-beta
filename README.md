# Jefe — marketing site

The public website for [Jefe](https://apps.apple.com/app/id6761315709), the iOS
app that turns a spoken site walk into notes, estimates and work orders.
It's three static pages and nothing else, in `public/`:

| File | Served at | Who links to it |
|------|-----------|-----------------|
| `public/index.html` | `/` | App Store support + marketing URL |
| `public/privacy.html` | `/privacy` | App Store privacy URL, the app's legal screen |
| `public/terms.html` | `/terms` | App Store description, the app's legal screen |

`public/img/` holds the screenshot the landing page uses. `public/robots.txt`
and `public/sitemap.xml` point crawlers at the canonical host. There is no build
step and no dependency to install. The pages carry one line of script, which
redirects the GitHub Pages copy (see below). Built in the app's "Field
Instrument" look (paper, ink, amber, the same fonts as the app) so it reads as
part of the product.

Only `public/` is ever served. This README, `docs/`, `.github/`,
`netlify.toml` and `wrangler.jsonc` stay in the repo and never reach the site.

## Where it lives

- **https://usejefe.com** is the address. Every page declares it as canonical.
- It's a **Cloudflare Worker with static assets** named `jefe-site`, on the
  damsac Cloudflare account. `wrangler.jsonc` is the whole configuration: no
  Worker script, just `public/` served as files, attached to `usejefe.com` and
  `www.usejefe.com` as Custom Domains.
- The domain is registered at Cloudflare and its DNS is there too. The zone also
  carries **email forwarding** (MX and TXT records). Deploys never touch those,
  and nobody else should either.
- `/privacy` and `/terms` serve the pages. `/privacy.html` and `/terms.html`
  307 to them, which is Cloudflare's default HTML handling, so links in both
  shapes land.
- **Netlify** (`getjefe.netlify.app`) used to host the site. It now only
  forwards: `netlify.toml` 301s every path to the same path on usejefe.com.
  It has to stay up, because App Store Connect and every shipped build still
  link to `getjefe.netlify.app/privacy.html`, `/terms.html`, `/terms` and `/`.
  Netlify still deploys `main` to do this, so leave the Netlify site connected.
- **GitHub Pages** is still switched on for this repo. Since the pages moved
  into `public/`, it no longer serves them at their old paths. Switch it off
  under Settings → Pages.

## Deploys

**Pushing to `main` publishes the live site.** `.github/workflows/deploy.yml`
runs `wrangler deploy` on every push to `main`. There is no staging step in
between. The same workflow can be run by hand from the Actions tab
(`workflow_dispatch`), for example to redeploy without a commit.

So nothing goes to `main` directly:

1. Work on a branch and open a pull request.
2. Look at it locally (below), on a phone too. Serve it on your network and open
   it from the phone.
3. Someone other than the author reviews it, and then it gets merged.

The workflow needs two repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`: the damsac account's ID.
- `CLOUDFLARE_API_TOKEN`: an account API token, limited to the damsac account
  and the `usejefe.com` zone. It needs:
  - **Workers Scripts: Edit** (account). Cloudflare's newer role model calls
    this Workers Admin. Admin rather than Editor is required because the first
    deploy *creates* the Worker.
  - **Workers Routes: Edit** on the `usejefe.com` zone. Any deploy that adds or
    changes the Custom Domains needs it.

  The **Edit Cloudflare Workers** token template grants both, plus the read
  permissions Wrangler uses. Narrow its account and zone resources to damsac and
  usejefe.com.

The privacy policy and the terms are legal text that the app and the App Store
listing point to. Change them on purpose, update the "Last updated" line when
you do, and say in the PR what changed and why.

## Preview locally

```bash
npx wrangler dev          # http://localhost:8787, same routing as production
# or, without Node:
cd public && python3 -m http.server 8000
```

`wrangler dev` runs the real asset rules, including `/privacy` → `privacy.html`.
A plain static server only answers to the `.html` names.

## www

`www.usejefe.com` is attached to the Worker so it answers, but it serves the
same pages as the apex, not a redirect. Workers' `_redirects` file can't match
on hostname. The canonical tags keep search engines on the apex in the
meantime. To make www a real 301, add a Redirect Rule on the zone (Rules →
Redirect Rules): when the hostname equals `www.usejefe.com`, redirect
dynamically to `concat("https://usejefe.com", http.request.uri.path)`, status
301, preserving the query string. Redirect Rules run ahead of the Worker.

## Cutover from Netlify (one time)

Two merges, in this order. The first puts the site on Cloudflare while Netlify
keeps serving the old address as it is. The second turns Netlify into a
forwarder, and it waits until usejefe.com is proven to serve.

1. **Secrets.** Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (above).
2. **DNS.** In Cloudflare DNS for `usejefe.com`, delete the two apex `A` records
   (`52.52.192.191`, `13.52.188.95`) and the `www` `CNAME` → `getjefe.netlify.app`.
   A Custom Domain can't be created over an existing record. Leave the MX and
   email TXT records alone. From here until step 3 finishes, usejefe.com doesn't
   resolve. Nothing links to it yet, so nothing breaks.
3. **Merge the Cloudflare change.** The Deploy workflow runs `wrangler deploy`,
   which creates the `jefe-site` Worker, attaches both Custom Domains, and
   creates their DNS records and certificates. Netlify redeploys from `public/`
   and keeps serving getjefe.netlify.app unchanged.
4. **Verify usejefe.com:**
   - `https://usejefe.com/`, `/privacy` and `/terms` return 200.
   - `/privacy.html` and `/terms.html` 307 to `/privacy` and `/terms`.
   - `www.usejefe.com` answers.
   - Email to a usejefe.com address still forwards.
5. **Only then, merge the Netlify forwarder.** Afterwards,
   `curl -sI https://getjefe.netlify.app/privacy.html` should show a 301 to
   `https://usejefe.com/privacy.html`. Check `/terms`, `/terms.html` and `/` the
   same way.

If the deploy in step 3 fails (a bad token, a leftover DNS record), nothing
user-facing breaks. getjefe.netlify.app is still serving the pages. Fix it and
re-run the workflow from the Actions tab.

## Contact

The address on the site is `damsac.app@gmail.com`. It's on every page and in
the legal text, so change it everywhere at once.
