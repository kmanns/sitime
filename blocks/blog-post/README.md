# Blog Post

## Overview
`blog-post` renders an editorial article shell from page metadata and appends DA.live-authored body content.

The block includes:
- Header area: category, title, description, author, published date.
- Hero image with ratio controls.
- Article body rendered from authored block rows/cells.
- Right-rail Table of Contents (TOC) generated from body headings (`h2`, `h3`, `h4`) with nested structure, active state, and progress.

The block is resilient by default:
- Invalid metadata values fall back to safe defaults with `blog-post:` console warnings.
- Missing metadata does not hard-fail rendering.

## DA.live Integration And Authoring Structure
### Page Metadata (required/expected)
Add a standard page `metadata` table near the top of the document:

| key | expected value |
| --- | --- |
| `title` | Article title |
| `description` | Article excerpt/subtitle |
| `image` | Hero image URL/path |
| `author` | Author display name |
| `category` | Category label |
| `authorimage` | Optional avatar image URL/path |
| `tags` | Optional tags (currently informational) |

Published date in the author area is sourced from DA.live index data for the current path (`query-index`/`sitemap`), not from authored page metadata.

### Block Authoring
- Insert `blog-post` block.
- Add article content in the block rows/cells using normal DA.live rich text formatting.
- Use `H2/H3/H4` in body content to drive TOC generation.
- Headings without text are ignored.

### DA.live Model Options
Current `_blog-post.json` defines no sidebar model fields; all behavior controls are section metadata driven.

| model field | values | effect |
| --- | --- | --- |
| none | n/a | Default DA.live block insertion only; configure via section metadata. |

### Section Metadata Placement Guidance
Place `section-metadata` immediately above the section that contains the `blog-post` block.

Supported section dataset key reads:
- Canonical: `blogpost-*` (for example `blogpost-layout`).
- Double-prefix alias: `dataBlogpost*` in `section.dataset` read path.

## Configuration Options
### Section Metadata Reference
### Layout
| key | possible values | effect |
| --- | --- | --- |
| `blogpost-layout` | `classic`, `centered`, `magazine`, `splitcover` | Default: `classic`. Controls high-level composition. `classic` keeps a standard header + hero + content flow. `centered` centers header/meta and simplifies body rail composition. `magazine` uses a split top region (header + hero) before content. `splitcover` creates an even split top canvas with left editorial header and right cover image. |
| `blogpost-width` | `default`, `wide` | Default: `default`. Controls maximum block container width. `wide` increases horizontal canvas and affects hero/content rail span. |

### Content And Behavior
| key | possible values | effect |
| --- | --- | --- |
| `blogpost-showdescription` | `true`, `false` | Default: `true`. Shows or hides the metadata description/excerpt below title. |
| `blogpost-showmeta` | `true`, `false` | Default: `true`. Shows or hides author and published date area. |
| `blogpost-showhero` | `true`, `false` | Default: `true`. Shows or hides hero image region. When `false`, hero-specific settings are no-op. |

### Style
| key | possible values | effect |
| --- | --- | --- |
| `blogpost-style` | `editorial`, `minimal` | Default: `editorial`. Controls presentation treatment for typography and header composition while preserving layout semantics. |
| `blogpost-tocstyle` | `editorial`, `minimal`, `contrast`, `outline` | Default: `editorial`. Controls TOC rail chrome only (surface, border, active-state treatment) without changing heading structure or scroll behavior. |

### Media
| key | possible values | effect |
| --- | --- | --- |
| `blogpost-heroratio` | `wide`, `landscape`, `square` | Default: `wide`. Controls hero aspect ratio only. Applies when hero is enabled. |

## Metadata Precedence
The block resolves and applies metadata in this order:

1. Layout tier
- `blogpost-layout`
- `blogpost-width`

2. Content/structure tier
- `blogpost-showdescription`
- `blogpost-showmeta`
- `blogpost-showhero`

3. Style/shape tier
- `blogpost-style`
- `blogpost-tocstyle`

4. Color/explicit overrides tier
- none currently (no direct color metadata fields)

5. Media/motion tier
- `blogpost-heroratio`
- TOC behavior is runtime-derived from content headings, not section metadata.

## Override Rules
| condition | winner | ignored/no-op fields | user-visible effect |
| --- | --- | --- | --- |
| `blogpost-showhero=false` and `blogpost-heroratio` set | `blogpost-showhero` | `blogpost-heroratio` | Hero is hidden; ratio has no visible effect. Warning emitted. |
| No `h2/h3/h4` in body | Content structure | TOC rail styles/active/progress | TOC is not rendered because there are no headings to index. |
| Invalid metadata token value | Normalizer fallback | Invalid token only | Block falls back to default for that field and logs a warning. |

## Conflict/No-op Notes
- `blogpost-heroratio` is a no-op when `blogpost-showhero=false`.
- TOC is automatically content-driven; there is no metadata toggle for TOC depth today.
- `tags` metadata is read but not currently rendered as a visual tags component.

## Conflict Matrix
| condition | winner | ignored/no-op | effect |
| --- | --- | --- | --- |
| Hero disabled + ratio set | `blogpost-showhero=false` | `blogpost-heroratio` | No hero area is rendered. |
| Missing metadata `title` | `document.title` fallback | metadata `title` only | Title still renders from document title fallback. |
| Missing metadata `image` with hero enabled | Runtime guard | hero image render path | Header/body render; hero omitted with warning. |

## Behavior Patterns
- Metadata normalization
  - All section metadata values are normalized and validated before rendering.
- Published date sourcing
  - Author-area published timestamp resolves from DA.live index entries for the current page path.
  - The block checks `published`/`publishDate`/`publishdate`/`publicationdate` and falls back to `lastModified` variants from the matched entry.
  - Rendered text is derived automatically from the DA.live value (including epoch timestamps), with raw text fallback only when parsing fails.
- TOC generation
  - Extracts heading tree from authored body (`h2` root, nested `h3`, nested `h4`).
  - Creates deterministic unique heading IDs for anchor links.
- Active heading tracking
  - Active TOC item follows reading position and heading anchor offset.
- Progress behavior
  - Progress rail tracks reading progress and snaps to completion at last heading or page bottom.
- Responsive behavior
  - Desktop: content and TOC rail in two-column composition.
  - Mobile: TOC collapsible panel behavior with toggle control.

## Accessibility Notes
- TOC uses semantic navigation landmarks:
  - `<nav aria-label="Table of contents">`
  - ordered lists for hierarchical heading structure.
- TOC links are keyboard-focusable and include visible `:focus-visible` styles.
- Heading anchors use `scroll-margin-top` to avoid fixed-header overlap on hash jumps.
- Interactive controls (TOC toggle) use native `<button>` semantics and `aria-expanded`/`aria-controls`.
- Minimum touch targets are maintained for TOC interaction rows.

## Troubleshooting
| symptom | likely cause | fix |
| --- | --- | --- |
| TOC does not appear | No `h2/h3/h4` headings in body content | Add at least one `H2` (or `H3/H4`) in authored body. |
| Published date missing under author | No matching DA.live index entry or missing index timestamp field | Verify page path appears in `/query-index.json` (or sitemap endpoints) with `published` or `lastModified` data. |
| Hero not shown | Missing `image` metadata or `blogpost-showhero=false` | Add `image` metadata and/or set `blogpost-showhero=true`. |
| Heading jump sits under nav | Cached CSS/JS or non-standard nav offset | Hard refresh and verify `scroll-margin-top` application on body headings. |
| Metadata value not taking effect | Invalid token spelling | Use allowed values exactly; check console for `blog-post:` warnings. |
| Unexpected layout | Section metadata placed on wrong section | Move `section-metadata` directly above the block section. |
