# Blog Tiles

## Overview
`blog-tiles` renders a tile grid of blog posts under `/blog/*` (excluding `/blog/index`) and is
intended for the `/blog` landing page.

The block automatically ingests posts from DA.live index endpoints and updates tiles when new
published posts appear in the index.

The block includes:
- Intro content area from authored block cells (optional)
- Featured tall tile for the latest post (image, title, description, author, published date)
- Secondary tile grid for remaining posts
- Auto-refresh polling to surface newly indexed posts without a full page reload

## DA.live Integration And Authoring Structure
- Create `/blog/index` as the blog landing page.
- Insert a `blog-tiles` block in that page.
- Keep individual blog post docs under `/blog/<slug>`.
- Publish new posts; once index endpoints include them, tiles update automatically.

### DA.live Model Options
Current `_blog-tiles.json` defines no sidebar model fields; behavior is section metadata driven.

| model field | values | effect |
| --- | --- | --- |
| none | n/a | Configure behavior via section metadata only. |

### Section Metadata Placement Guidance
Place `section-metadata` immediately above the section containing `blog-tiles`.

Supported key read paths:
- canonical: `blogtiles-*`
- double-prefix alias in dataset: `dataBlogtiles*`

## Configuration Options
### Section Metadata Reference
### Layout
| key/field | possible values | effect |
| --- | --- | --- |
| `blogtiles-limit` | integer `1..200` | Default: `24`. Maximum number of posts rendered in the tile grid. |

### Content/Behavior
| key/field | possible values | effect |
| --- | --- | --- |
| `blogtiles-sort` | `newest`, `oldest` | Default: `newest`. Sorts tiles by index timestamp fields. |
| `blogtiles-showdescription` | `true`, `false` | Default: `true`. Shows/hides description copy in each tile. |
| `blogtiles-pollseconds` | integer `0..600` | Default: `15`. Poll interval for index refresh; `0` disables polling. |

### Style
| key/field | possible values | effect |
| --- | --- | --- |
| none | n/a | Tile style is controlled by block CSS and design tokens. |

### Media
| key/field | possible values | effect |
| --- | --- | --- |
| none | n/a | Images are loaded through `createOptimizedPicture` with lazy loading. |

## Metadata Precedence
The block resolves metadata in this order:

1. Layout tier
- `blogtiles-limit`

2. Content/structure tier
- `blogtiles-sort`
- `blogtiles-showdescription`
- `blogtiles-pollseconds`

3. Style/shape tier
- none (token-driven tile style)

4. Color/explicit overrides tier
- none

5. Media/motion tier
- index refresh cadence via `blogtiles-pollseconds`

## Override Rules
| condition | winner | ignored/no-op fields | user-visible effect |
| --- | --- | --- | --- |
| Invalid `blogtiles-limit` | normalizer fallback | invalid `blogtiles-limit` | Uses default limit and logs warning. |
| Invalid `blogtiles-sort` | normalizer fallback | invalid `blogtiles-sort` | Uses newest-first sorting and logs warning. |
| Latest-post promotion | featured-slot rule | list sort preference for first tile | Newest post is always shown in the featured tall tile. |
| `blogtiles-showdescription=false` | visibility toggle | tile description content | Description text is hidden in all tiles. |
| `blogtiles-pollseconds=0` | polling disable flag | refresh timer | Block fetches once on load and on focus/visibility only. |

## Conflict/No-op Notes
- Posts are discovered by path (`/blog/*`) and index data, not by authored block rows.
- `/blog/index` is excluded from tile results by design.
- Featured tile is sourced from the first sorted post and keeps the image unfiltered (no blur/darkening layer).
- `blogtiles-sort` affects the secondary tile grid order; featured remains newest.
- Index freshness depends on publish/index propagation; the block uses cache-busted requests to
  minimize stale responses.

## Conflict Matrix
| condition | winner | ignored/no-op | effect |
| --- | --- | --- | --- |
| Empty index data | runtime guard | tile rendering | Shows empty-state message and logs warning. |
| Missing tile image | tile renderer | image media region | Tile renders text-only safely. |
| Duplicate index paths | dedupe pass | repeated entries | Only one tile per unique path is rendered. |

## Behavior Patterns
- Uses `getConfigValue` helper for deterministic metadata resolution.
- Validates and normalizes all supported metadata values.
- Fetches index endpoints with cache-busting parameters and `no-store` policy to discover blog
  post paths and baseline timestamps.
- Fetches each discovered post page and derives card content from page metadata (`title`,
  `description`, `image`/`og:image`, `author`, `authorimage`, `category`, publish timestamp
  variants).
- Uses index timestamp data as fallback when post-level publish metadata is not present.
- Refreshes tiles on visibility/focus and optional polling interval.

## Accessibility Notes
- Each tile is an `<article>` with a semantic anchor for navigation.
- Focus-visible outline is present for keyboard users.
- Hover styles are non-essential; navigation remains available without pointer interactions.
- Tap targets remain larger than `44x44` through tile link structure and spacing.

## Troubleshooting
| symptom | likely cause | fix |
| --- | --- | --- |
| No tiles on `/blog` | No `/blog/*` entries in index | Publish posts and confirm index endpoints include blog paths. |
| New post not visible yet | Index propagation delay | Wait for publish/index update, then reload or rely on polling refresh. |
| Wrong ordering | Invalid `blogtiles-sort` value | Use `newest` or `oldest`. |
| Too many/few tiles | Incorrect `blogtiles-limit` | Set `blogtiles-limit` to desired maximum. |
| Descriptions not shown | `blogtiles-showdescription=false` | Set `blogtiles-showdescription=true`. |
