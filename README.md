# Jefe — marketing site

The public website for [Jefe](https://apps.apple.com/app/id6761315709), the iOS
app that turns a spoken site walk into notes, estimates and work orders.
It's three static pages and nothing else:

| File | What it is | Who links to it |
|------|------------|-----------------|
| `index.html` | The landing page. Sends people to the App Store. | App Store support + marketing URL |
| `privacy.html` | Privacy Policy | App Store privacy URL, the app's legal screen |
| `terms.html` | Terms of Service | App Store description, the app's legal screen |

`img/` holds the screenshot the landing page uses. `robots.txt` and
`sitemap.xml` point search engines at the canonical host. No build step, no
dependencies, no JavaScript beyond one line that redirects the GitHub Pages copy
(see below). Built in the app's "Field Instrument" look (paper, ink, amber, the
same fonts as the app) so it reads as part of the product.

## Where it lives

- **https://usejefe.com** is the canonical address. Every page carries
  `<link rel="canonical">` to it.
- Hosted on **Netlify**, site `getjefe`. `netlify.toml` 301-redirects
  `getjefe.netlify.app` and `www.usejefe.com` to `https://usejefe.com`, keeping
  the path, so the old links already in App Store Connect and in shipped builds
  (`getjefe.netlify.app/privacy.html`, `/terms.html`, `/terms`, `/`) keep landing.
- The domain is registered at Cloudflare, and its DNS points at Netlify.
- GitHub Pages is also switched on for this repo and serves a copy at
  `damsac.github.io/jefe-beta`. That copy is a leftover, not a second site. Its
  pages redirect to usejefe.com and declare usejefe.com as canonical. The clean
  fix is to switch Pages off under Settings → Pages.

## Deploys

**Pushing to `main` publishes the live site.** Netlify watches `main` and
deploys it as-is. There is no staging step in between.

So nothing goes to `main` directly:

1. Work on a branch and open a pull request.
2. Netlify builds a deploy preview for the PR
   (`deploy-preview-<N>--getjefe.netlify.app`). Look at it on a phone.
3. Someone other than the author reviews it, and then it gets merged.

The privacy policy and the terms are legal text that the app and the App Store
listing point to. Change them on purpose, update the "Last updated" line when
you do, and say in the PR what changed and why.

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` straight from disk mostly works, but the screenshot and
the footer links use root paths (`/img/…`, `/terms`), and those need a server.
`/terms` and `/privacy` without `.html` only resolve on Netlify, which serves
`terms.html` for `/terms` on its own.

## Contact

The address on the site is `damsac.app@gmail.com`. It's on every page and in
the legal text, so change it everywhere at once.
