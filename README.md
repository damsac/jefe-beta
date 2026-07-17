# Jefe — beta landing page

A single-file static site that explains Jefe to non-technical field crews and
walks them through installing the TestFlight beta, plus a waitlist signup.
Built in the Jefe "Field Instrument" look (paper/ink/amber, same fonts as the
app) so it feels like part of the product.

Live target: GitHub Pages under `sacmeng` → `https://sacmeng.github.io/<repo>`.

---

## ⚙️ Two things to plug in before it goes live

Both are clearly marked in `index.html` (search for the ⬇⬇ comments):

1. **Your public TestFlight join link** — Step 2 button.
   Replace `https://testflight.apple.com/join/XXXXXXXX` with the real link.
   - Get it in **App Store Connect → your app → TestFlight → External Testing →
     (create/select a group) → Public Link → Enable**. Copy that URL.
   - Note: a *public* link requires an **External** testing group, which needs a
     one-time **Beta App Review** (usually a day or so). Internal-only builds
     don't get a public link — those are invite-by-email. This page assumes the
     public link path (the "share with anyone" flow you wanted).

2. **Your Formspree endpoint** — the waitlist form `action`.
   Replace `https://formspree.io/f/YOUR_FORM_ID` with your form's URL.
   - Create a free form at **formspree.io**, point it at your email, copy the
     `https://formspree.io/f/xxxxxxx` endpoint it gives you.
   - Until it's set, the form shows a friendly "not hooked up yet" message
     instead of silently failing.

Optional: the contact email in the footer + `mailto:` is `isaacwm23@gmail.com` —
swap it if you want a different inbox on the public page.

---

## 🚀 Deploy to GitHub Pages

```bash
# 1. Create a public repo under sacmeng (via the gh CLI or github.com), e.g. "jefe-beta"
gh repo create sacmeng/jefe-beta --public --source=. --remote=origin --push

# 2. Enable Pages: repo Settings → Pages → Source: "Deploy from a branch" → main / (root)
#    (or: gh api ... — the web UI is easiest)
```

Your link will be `https://sacmeng.github.io/jefe-beta/`. Share that.

Want a cleaner URL later (e.g. `getjefe.app`)? Buy the domain, add a `CNAME`
file with the domain, and point the DNS at GitHub Pages — the site is already
domain-ready.

---

## 🔎 Preview locally

Just open `index.html` in a browser. No build step, no dependencies.

## Heads-up: the app may show as "Sitewalk"

The TestFlight build's display name is still **Sitewalk** (an earlier name).
Step 3 tells testers this so they aren't confused. Cleanest fix is to rename the
app's `CFBundleDisplayName` to Jefe in the iOS project + the App Store Connect
listing; until then the note handles it.
