import { createOptimizedPicture } from '../../scripts/aem.js';

const DEFAULTS = {
  limit: 24,
  sort: 'newest',
  showdescription: true,
  pollseconds: 15,
};

const CLEANUP_KEY = 'blogTilesCleanup';

function warnInvalid(key, rawValue, fallback) {
  if (!rawValue || !rawValue.toString().trim()) return;
  // eslint-disable-next-line no-console
  console.warn(`blog-tiles: invalid ${key} "${rawValue}". Using "${fallback}".`);
}

function getConfigValue(blockValue, sectionData, keys, fallback) {
  if (typeof blockValue === 'string' && blockValue.trim()) return blockValue;
  for (let i = 0; i < keys.length; i += 1) {
    const value = sectionData?.[keys[i]];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

function normalizeToken(key, value, allowed, fallback) {
  const normalized = (value || '').toString().trim().toLowerCase();
  if (!normalized) return fallback;
  if (allowed.includes(normalized)) return normalized;
  warnInvalid(key, value, fallback);
  return fallback;
}

function normalizeBoolean(key, value, fallback) {
  const normalized = (value || '').toString().trim().toLowerCase();
  if (!normalized) return fallback;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  warnInvalid(key, value, fallback ? 'true' : 'false');
  return fallback;
}

function normalizeInteger(key, value, min, max, fallback) {
  const raw = (value || '').toString().trim();
  if (!raw) return fallback;
  const num = Number.parseInt(raw, 10);
  if (Number.isNaN(num) || num < min || num > max) {
    warnInvalid(key, value, `${fallback}`);
    return fallback;
  }
  return num;
}

function readConfig(block) {
  const sectionData = block.closest('.section')?.dataset || {};

  return {
    limit: normalizeInteger(
      'blogtiles-limit',
      getConfigValue(
        block.dataset.blogtilesLimit,
        sectionData,
        ['blogtilesLimit', 'dataBlogtilesLimit'],
        `${DEFAULTS.limit}`,
      ),
      1,
      200,
      DEFAULTS.limit,
    ),
    sort: normalizeToken(
      'blogtiles-sort',
      getConfigValue(
        block.dataset.blogtilesSort,
        sectionData,
        ['blogtilesSort', 'dataBlogtilesSort'],
        DEFAULTS.sort,
      ),
      ['newest', 'oldest'],
      DEFAULTS.sort,
    ),
    showdescription: normalizeBoolean(
      'blogtiles-showdescription',
      getConfigValue(
        block.dataset.blogtilesShowdescription,
        sectionData,
        ['blogtilesShowdescription', 'dataBlogtilesShowdescription'],
        DEFAULTS.showdescription ? 'true' : 'false',
      ),
      DEFAULTS.showdescription,
    ),
    pollseconds: normalizeInteger(
      'blogtiles-pollseconds',
      getConfigValue(
        block.dataset.blogtilesPollseconds,
        sectionData,
        ['blogtilesPollseconds', 'dataBlogtilesPollseconds'],
        `${DEFAULTS.pollseconds}`,
      ),
      0,
      600,
      DEFAULTS.pollseconds,
    ),
  };
}

function normalizePath(rawPath) {
  const raw = (rawPath || '').toString().trim();
  if (!raw) return '';

  if (raw.startsWith('/')) {
    const withoutQuery = raw.split(/[?#]/)[0];
    const withoutTrailingSlash = (
      withoutQuery.length > 1 && withoutQuery.endsWith('/')
        ? withoutQuery.slice(0, -1)
        : withoutQuery
    );
    return withoutTrailingSlash.endsWith('.html')
      ? withoutTrailingSlash.slice(0, -5)
      : withoutTrailingSlash;
  }

  try {
    const parsed = new URL(raw, window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return normalizePath(parsed.pathname);
  } catch {
    return '';
  }
}

function resolveEntryPath(entry) {
  const candidates = [entry.path, entry.url, entry.href, entry.permalink, entry.slug];

  for (let i = 0; i < candidates.length; i += 1) {
    const path = normalizePath(candidates[i]);
    if (path) return path;
  }

  return '';
}

function normalizeIndexData(json) {
  if (!json) return [];
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json)) return json;
  return [];
}

function readIndexString(value) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const candidate = (value[i] || '').toString().trim();
      if (candidate) return candidate;
    }
    return '';
  }
  return (value || '').toString().trim();
}

function isBlogPostPath(path) {
  const segments = path
    .toLowerCase()
    .split('/')
    .filter(Boolean);

  const blogIndex = segments.lastIndexOf('blog');
  if (blogIndex < 0) return false;
  if (blogIndex >= segments.length - 1) return false;
  if (segments[segments.length - 1] === 'index') return false;
  return true;
}

function parseTimestamp(value) {
  const raw = (value || '').toString().trim();
  if (!raw) return 0;

  if (/^\d+$/.test(raw)) {
    const numeric = Number.parseInt(raw, 10);
    if (Number.isNaN(numeric)) return 0;
    return raw.length <= 10 ? numeric * 1000 : numeric;
  }

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatPublishedDate(value) {
  const ts = parseTimestamp(value);
  if (!ts) return '';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ts));
}

function toTitleFromPath(path) {
  const raw = (path.split('/').pop() || '').replace(/[-_]+/g, ' ').trim();
  return raw ? raw.replace(/\b\w/g, (match) => match.toUpperCase()) : 'Untitled Post';
}

function addCacheBust(path) {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  return path.includes('?') ? `${path}&cb=${stamp}` : `${path}?cb=${stamp}`;
}

async function fetchBlogEntriesFresh(signal) {
  const candidates = [
    '/query-index.json',
    '/blog/query-index.json',
    '/sitemap.json',
    '/blog/sitemap.json',
  ];

  const responses = await Promise.all(candidates.map(async (candidate) => {
    try {
      const response = await fetch(addCacheBust(candidate), {
        signal,
        cache: 'no-store',
        headers: {
          pragma: 'no-cache',
          'cache-control': 'no-cache',
        },
      });
      if (!response.ok) return [];
      return normalizeIndexData(await response.json());
    } catch {
      return [];
    }
  }));

  return responses.flat();
}

function toPosts(entries) {
  const posts = entries
    .map((entry) => {
      const path = resolveEntryPath(entry);
      if (!path || !isBlogPostPath(path)) return null;

      const published = (
        readIndexString(entry.published)
        || readIndexString(entry.publishDate)
        || readIndexString(entry.publishdate)
        || readIndexString(entry.publicationdate)
        || readIndexString(entry.lastModified)
        || readIndexString(entry.lastmodified)
        || readIndexString(entry.lastmod)
        || ''
      );

      return {
        path,
        title: toTitleFromPath(path),
        description: '',
        image: '',
        author: '',
        authorimage: '',
        category: '',
        published,
        sortValue: parseTimestamp(published),
      };
    })
    .filter(Boolean);

  const deduped = [];
  const seen = new Set();
  posts.forEach((post) => {
    if (seen.has(post.path)) return;
    seen.add(post.path);
    deduped.push(post);
  });

  deduped.sort((a, b) => b.sortValue - a.sortValue);
  return deduped;
}

function getMetaContent(doc, selectors) {
  for (let i = 0; i < selectors.length; i += 1) {
    const el = doc.querySelector(selectors[i]);
    const content = (el?.getAttribute('content') || '').trim();
    if (content) return content;
  }
  return '';
}

async function enrichPostFromPage(post, signal) {
  try {
    const response = await fetch(addCacheBust(post.path), {
      signal,
      cache: 'no-store',
      headers: {
        pragma: 'no-cache',
        'cache-control': 'no-cache',
      },
    });
    if (!response.ok) return post;

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const title = (
      getMetaContent(doc, ['meta[property="og:title"]'])
      || (doc.querySelector('title')?.textContent || '').trim()
      || post.title
    );
    const description = (
      getMetaContent(doc, ['meta[name="description"]', 'meta[property="og:description"]'])
      || post.description
    );
    const image = (
      getMetaContent(doc, ['meta[name="image"]', 'meta[property="og:image"]'])
      || post.image
    );
    const author = getMetaContent(doc, ['meta[name="author"]']) || post.author;
    const authorimage = getMetaContent(doc, ['meta[name="authorimage"]']) || post.authorimage;
    const category = getMetaContent(doc, ['meta[name="category"]']) || post.category;
    const published = (
      getMetaContent(doc, [
        'meta[property="article:published_time"]',
        'meta[name="publication-date"]',
        'meta[name="publishdate"]',
      ])
      || post.published
    );

    return {
      ...post,
      title,
      description,
      image,
      author,
      authorimage,
      category,
      published,
      sortValue: parseTimestamp(published) || post.sortValue,
    };
  } catch {
    return post;
  }
}

async function enrichPostsFromPages(posts, signal) {
  const enriched = await Promise.all(posts.map((post) => enrichPostFromPage(post, signal)));
  return enriched;
}

function buildSignature(posts) {
  return posts.map((post) => (
    `${post.path}:${post.sortValue}:${post.title}:${post.image}:${post.author}:${post.description}:${post.category}:${post.published}`
  )).join('|');
}

function extractIntro(block) {
  const intro = document.createElement('div');
  intro.className = 'blog-tiles-intro';

  const rows = [...block.children];
  rows.forEach((row) => {
    const cells = [...row.children];
    cells.forEach((cell) => {
      const hasContent = [...cell.childNodes].some((node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim().length > 0;
        return true;
      });
      if (!hasContent) return;

      const part = document.createElement('div');
      part.className = 'blog-tiles-intro-part';
      [...cell.childNodes].forEach((node) => {
        part.append(node.cloneNode(true));
      });
      intro.append(part);
    });
  });

  return intro.children.length ? intro : null;
}

function createMetaRow(post, classBase) {
  const hasAuthor = Boolean(post.author || post.authorimage);
  const dateText = formatPublishedDate(post.published);
  const hasDate = Boolean(dateText);

  if (!hasAuthor && !hasDate) return null;

  const meta = document.createElement('div');
  meta.className = `${classBase}-meta`;

  if (hasAuthor) {
    const author = document.createElement('div');
    author.className = `${classBase}-author`;

    if (post.authorimage) {
      const avatar = document.createElement('img');
      avatar.className = `${classBase}-author-avatar`;
      avatar.src = post.authorimage;
      avatar.alt = post.author ? `${post.author} avatar` : 'Author avatar';
      avatar.loading = 'lazy';
      avatar.decoding = 'async';
      author.append(avatar);
    }

    if (post.author) {
      const name = document.createElement('span');
      name.className = `${classBase}-author-name`;
      name.textContent = post.author;
      author.append(name);
    }

    meta.append(author);
  }

  if (hasDate) {
    const date = document.createElement('p');
    date.className = `${classBase}-date`;
    date.textContent = dateText;
    meta.append(date);
  }

  return meta;
}

function createFeaturedTile(post, config) {
  const article = document.createElement('article');
  article.className = 'blog-tiles-featured';

  const link = document.createElement('a');
  link.className = 'blog-tiles-featured-link';
  link.href = post.path;
  link.setAttribute('aria-label', post.title);

  if (post.image) {
    const media = document.createElement('div');
    media.className = 'blog-tiles-featured-media';
    const picture = createOptimizedPicture(post.image, post.title, false, [
      { media: '(min-width: 1200px)', width: '1800' },
      { media: '(min-width: 768px)', width: '1200' },
      { width: '900' },
    ]);
    const img = picture.querySelector('img');
    if (img) {
      img.addEventListener('error', () => {
        article.dataset.blogtilesImage = 'missing';
      }, { once: true });
    }
    media.append(picture);
    link.append(media);
  } else {
    article.dataset.blogtilesImage = 'missing';
  }

  const content = document.createElement('div');
  content.className = 'blog-tiles-featured-content';

  if (post.category) {
    const category = document.createElement('p');
    category.className = 'blog-tiles-featured-category';
    category.textContent = post.category;
    content.append(category);
  }

  const title = document.createElement('h2');
  title.className = 'blog-tiles-featured-title';
  title.textContent = post.title;
  content.append(title);

  if (config.showdescription && post.description) {
    const description = document.createElement('p');
    description.className = 'blog-tiles-featured-description';
    description.textContent = post.description;
    content.append(description);
  }

  const meta = createMetaRow(post, 'blog-tiles-featured');
  if (meta) content.append(meta);

  link.append(content);
  article.append(link);
  return article;
}

function createTile(post, config) {
  const article = document.createElement('article');
  article.className = 'blog-tiles-tile';

  const link = document.createElement('a');
  link.className = 'blog-tiles-tile-link';
  link.href = post.path;
  link.setAttribute('aria-label', post.title);

  if (post.image) {
    const media = document.createElement('div');
    media.className = 'blog-tiles-tile-media';
    const picture = createOptimizedPicture(post.image, post.title, false, [
      { media: '(min-width: 1200px)', width: '900' },
      { media: '(min-width: 768px)', width: '640' },
      { width: '480' },
    ]);
    media.append(picture);
    link.append(media);
  }

  const body = document.createElement('div');
  body.className = 'blog-tiles-tile-body';

  if (post.category) {
    const category = document.createElement('p');
    category.className = 'blog-tiles-tile-category';
    category.textContent = post.category;
    body.append(category);
  }

  const title = document.createElement('h3');
  title.className = 'blog-tiles-tile-title';
  title.textContent = post.title;
  body.append(title);

  if (config.showdescription && post.description) {
    const description = document.createElement('p');
    description.className = 'blog-tiles-tile-description';
    description.textContent = post.description;
    body.append(description);
  }

  const meta = createMetaRow(post, 'blog-tiles-tile');
  if (meta) body.append(meta);

  link.append(body);
  article.append(link);
  return article;
}

function renderTiles(grid, posts, config) {
  grid.replaceChildren();

  if (!posts.length) {
    const empty = document.createElement('p');
    empty.className = 'blog-tiles-empty';
    empty.textContent = 'No blog posts found in /blog.';
    grid.append(empty);
    return;
  }

  const layout = document.createElement('div');
  layout.className = 'blog-tiles-layout';

  const [featured, ...remaining] = posts;
  const rest = config.sort === 'oldest' ? [...remaining].reverse() : remaining;
  const top = document.createElement('div');
  top.className = 'blog-tiles-top';
  top.append(createFeaturedTile(featured, config));

  const side = document.createElement('div');
  side.className = 'blog-tiles-side';
  rest.slice(0, 4).forEach((post) => {
    side.append(createTile(post, config));
  });
  if (side.children.length) top.append(side);
  layout.append(top);

  const overflow = rest.slice(4);
  if (overflow.length) {
    const bottom = document.createElement('div');
    bottom.className = 'blog-tiles-bottom';
    overflow.forEach((post) => {
      bottom.append(createTile(post, config));
    });
    layout.append(bottom);
  }

  grid.append(layout);
}

export default async function decorate(block) {
  const config = readConfig(block);
  const intro = extractIntro(block);

  block.dataset.blogtilesLimit = `${config.limit}`;
  block.dataset.blogtilesSort = config.sort;
  block.dataset.blogtilesShowdescription = config.showdescription ? 'true' : 'false';
  block.dataset.blogtilesPollseconds = `${config.pollseconds}`;
  block.dataset.loading = 'true';

  const existingCleanup = block[CLEANUP_KEY];
  if (typeof existingCleanup === 'function') existingCleanup();

  const wrapper = document.createElement('div');
  wrapper.className = 'blog-tiles-wrap';

  if (intro) wrapper.append(intro);

  const grid = document.createElement('div');
  grid.className = 'blog-tiles-grid';
  wrapper.append(grid);

  block.replaceChildren(wrapper);

  const abortController = new AbortController();
  let pollTimer = null;
  let inFlight = false;
  let lastSignature = '';

  const refresh = async () => {
    if (inFlight) return;
    inFlight = true;

    try {
      const entries = await fetchBlogEntriesFresh(abortController.signal);
      if (!entries.length) {
        // eslint-disable-next-line no-console
        console.warn('blog-tiles: no index entries returned from query/sitemap endpoints.');
      }

      const indexedPosts = toPosts(entries).slice(0, config.limit);
      const posts = await enrichPostsFromPages(indexedPosts, abortController.signal);
      posts.sort((a, b) => b.sortValue - a.sortValue);
      const signature = buildSignature(posts);

      if (signature !== lastSignature) {
        renderTiles(grid, posts, config);
        lastSignature = signature;
      }
    } catch (error) {
      if (abortController.signal.aborted) return;
      // eslint-disable-next-line no-console
      console.warn('blog-tiles: failed to refresh tiles from index.', error);
    } finally {
      inFlight = false;
      delete block.dataset.loading;
    }
  };

  const onVisibleRefresh = () => {
    if (document.visibilityState === 'visible') refresh();
  };

  document.addEventListener('visibilitychange', onVisibleRefresh, {
    signal: abortController.signal,
    passive: true,
  });
  window.addEventListener('focus', refresh, {
    signal: abortController.signal,
    passive: true,
  });

  if (config.pollseconds > 0) {
    pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, config.pollseconds * 1000);
  }

  block[CLEANUP_KEY] = () => {
    abortController.abort();
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  await refresh();
}
