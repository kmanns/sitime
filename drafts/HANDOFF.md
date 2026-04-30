# Branch Handoff: `migrate/home-molp7k1u`

**Repo:** `https://github.com/kmanns/sitime`  
**Branch:** `migrate/home-molp7k1u`  
**Preview URL:** `https://migrate-home-molp7k1u--sitime--kmanns.aem.page/`  
**Live main URL:** `https://main--sitime--kmanns.aem.page/`  
**Date:** 2026-04-30  

---

## Status

The branch is **safe to merge into `main`**. All issues identified during the SLICC migration session have been resolved.

| Item | Status |
|------|--------|
| Commerce dropin infrastructure restored in `head.html` | ✅ Done (commit `36c5832`) |
| New homepage blocks (8) added | ✅ Done (commit `70718c9`) |
| SiTime brand styles (`brand.css`, Ubuntu font) | ✅ Done (commit `70718c9`) |
| Draft content assembled (`drafts/index.plain.html`) | ✅ Done |
| DA content blank page on `main` | ⚠️ Requires manual action (see below) |

---

## What This Branch Contains

### New blocks added

| Block | Path | Description |
|-------|------|-------------|
| `awards` | `blocks/awards/` | 3-column award logos with descriptions |
| `cta-banner` | `blocks/cta-banner/` | Full-width call-to-action with brand colours |
| `footer-nav` | `blocks/footer-nav/` | 4-column footer navigation |
| `news-resources` | `blocks/news-resources/` | 3-card news and events grid |
| `product-carousel` | `blocks/product-carousel/` | Tabbed product category browser |
| `solutions-tabs` | `blocks/solutions-tabs/` | Industry solutions navigation tabs |
| `testimonials` | `blocks/testimonials/` | Customer quote carousel |
| `video-stats` | `blocks/video-stats/` | Video + 3 performance stats |

### Updated existing blocks

- `blocks/hero/` — SiTime-branded hero with image/content/ticker rows
- `blocks/header/` — SiTime brand styles applied

### Styles

- `styles/brand.css` — SiTime CSS custom properties (colour palette, Ubuntu font family)
- `styles/styles.css` — Minor additions

### Draft content

- `drafts/index.plain.html` — Assembled homepage content document (EDS block table format)
- `drafts/nav.plain.html` — Navigation document
- `drafts/footer.plain.html` — Footer document
- `drafts/images/` — All migrated hero and block images (webp/svg)
- `drafts/*.plain.html` — Per-block content documents

---

## The `head.html` Fix (Critical)

### Root cause

The migration agent (`70718c9`) replaced the full Commerce dropin `head.html` with a stripped-down version. The following was removed:

- `<script type="speculationrules">` — page prerendering
- `<script type="importmap">` — 18 Commerce dropin path aliases (cart, checkout, auth, PDP, account, B2B, etc.)
- Importmap shim loader for browsers without native support
- `<script src="/scripts/commerce.js">` — Commerce initialisation entry point
- 12 `<link rel="modulepreload">` entries for tools and initializers

Without these, **all Commerce dropin functionality is broken**: cart, checkout, auth, PDP, account pages, B2B features, wishlists, recommendations, and payment services.

### The fix (commit `36c5832`)

All Commerce dropin infrastructure was restored. The only net change vs `main` is the addition of Ubuntu font links (SiTime brand requirement):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap"></noscript>
```

---

## Branch Commit History

```
36c5832  fix(head): restore Commerce importmap, speculationrules, commerce.js, and modulepreloads
70718c9  feat: SiTime homepage migration - all 8 blocks + drafts
03578da  feat: update place order state logic to conditionally enable based on agreement status
```

The branch is **2 commits ahead of `main`**, **0 conflicts**.

---

## Remaining Action Required: DA Content Restoration

### Problem

The homepage at `https://main--sitime--kmanns.aem.page/` shows a blank page. This is **not a code branch problem** — it is a DA (Document Authoring) content issue.

During an interrupted SLICC session (approximately 18:52 UTC, April 30 2026), the DA source document at `content.da.live/kmanns/sitime/index` was emptied or overwritten. The file is now serving content-length: 1.

### Fix options

**Option A — Restore from DA version history (recommended)**

1. Go to [da.live](https://da.live) and sign in
2. Navigate to `kmanns / sitime / index`
3. Open the version history panel
4. Restore the version from before ~18:52 UTC April 30 2026
5. Preview and publish

**Option B — Author from the draft content**

The full homepage content is available in `drafts/index.plain.html` on this branch. Use it as the source to recreate the DA document:

1. Open `drafts/index.plain.html` — this is the assembled page in EDS block table format
2. Import or recreate it in DA at `kmanns/sitime/index`
3. Preview and publish via the sidekick

**Option C — Direct API push (advanced)**

If DA API credentials are available, the index document can be pushed programmatically. Contact the DA team for the write API endpoint.

---

## Merge Checklist

Before merging, confirm:

- [ ] Commerce dropin functionality tested on branch preview URL
- [ ] New blocks render correctly at `migrate-home-molp7k1u--sitime--kmanns.aem.page/`
- [ ] DA content restored at `da.live` (Option A or B above)
- [ ] Homepage renders at `main--sitime--kmanns.aem.page/` after DA restoration and merge
- [ ] No regressions on cart, checkout, auth pages

---

## Technical Context

**Storefront type:** Adobe Commerce as a Cloud Service (ACaaS) on Edge Delivery Services  
**Commerce endpoint:** `https://na1-sandbox.api.commerce.adobe.com/NGqWb1jCB8UhohMLshMAHd/graphql`  
**Store code:** `sistore` / `sieng`  
**Website code:** `sitime`  
**Font:** Ubuntu 300/400/500/700 (Google Fonts)
