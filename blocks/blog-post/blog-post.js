import { createOptimizedPicture, getMetadata } from '../../scripts/aem.js';

const DEFAULTS = {
  layout: 'classic',
  width: 'default',
  style: 'editorial',
  tocstyle: 'editorial',
  showdescription: true,
  showmeta: true,
  showhero: true,
  heroratio: 'wide',
};
const TOC_STYLES = ['editorial', 'minimal', 'contrast', 'outline'];

function warnInvalid(key, rawValue, fallback) {
  if (!rawValue || !rawValue.toString().trim()) return;
  // eslint-disable-next-line no-console
  console.warn(`blog-post: invalid ${key} "${rawValue}". Using "${fallback}".`);
}

function warnNoOp(key, rawValue, reason) {
  if (!rawValue || !rawValue.toString().trim()) return;
  // eslint-disable-next-line no-console
  console.warn(`blog-post: ${key} "${rawValue}" has no effect. ${reason}`);
}

function warnMissingMetadata(field) {
  // eslint-disable-next-line no-console
  console.warn(`blog-post: missing page metadata "${field}".`);
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

function sanitizeUrl(url) {
  const raw = (url || '').toString().trim();
  if (!raw) return '';

  if (raw.startsWith('//')) return '';
  if (['#', '/', './', '../', '?'].some((token) => raw.startsWith(token))) return raw;

  try {
    const parsed = new URL(raw, window.location.origin);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return raw;
    return '';
  } catch {
    return '';
  }
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
    const normalized = normalizePath(candidates[i]);
    if (normalized) return normalized;
  }
  return '';
}

function normalizeIndexData(json) {
  if (!json) return [];
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json)) return json;
  return [];
}

async function fetchDaIndexEntries() {
  const candidates = [
    '/query-index.json',
    '/blog/query-index.json',
    '/sitemap.json',
    '/blog/sitemap.json',
  ];

  const responses = await Promise.all(candidates.map(async (candidate) => {
    try {
      const response = await fetch(candidate, { cache: 'no-store' });
      if (!response.ok) return [];
      return normalizeIndexData(await response.json());
    } catch {
      return [];
    }
  }));

  return responses.flat();
}

function parseDaPublishedDate(rawValue) {
  const raw = (rawValue || '').toString().trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const numeric = Number.parseInt(raw, 10);
    if (Number.isNaN(numeric)) return null;
    const epochMs = raw.length <= 10 ? numeric * 1000 : numeric;
    const parsedEpoch = new Date(epochMs);
    return Number.isNaN(parsedEpoch.getTime()) ? null : parsedEpoch;
  }

  let candidate = raw;
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    candidate = raw.replace(' ', 'T');
  }

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDaPublishedDate(parsedDate) {
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) return '';

  const dateText = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
  const timeText = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsedDate);
  return `${dateText} ${timeText}`;
}

async function resolveDaPublishedMeta() {
  const currentPath = normalizePath(window.location.pathname);
  if (!currentPath) return null;

  const entries = await fetchDaIndexEntries();
  if (!entries.length) {
    // eslint-disable-next-line no-console
    console.warn('blog-post: no DA.live index entries returned from query/sitemap endpoints.');
    return null;
  }

  const matchingEntry = entries.find((entry) => resolveEntryPath(entry) === currentPath);
  if (!matchingEntry) {
    // eslint-disable-next-line no-console
    console.warn(`blog-post: no DA.live index entry matched path "${currentPath}".`);
    return null;
  }

  const rawPublished = (
    matchingEntry.published
    || matchingEntry.publishDate
    || matchingEntry.publishdate
    || matchingEntry.publicationdate
    || matchingEntry.lastModified
    || matchingEntry.lastmodified
    || matchingEntry.lastmod
    || ''
  );

  const text = (rawPublished || '').toString().trim();
  if (!text) {
    // eslint-disable-next-line no-console
    console.warn('blog-post: matched DA.live entry has no published timestamp value.');
    return null;
  }

  const parsed = parseDaPublishedDate(text);
  return {
    dateTime: parsed ? parsed.toISOString() : '',
    text: parsed ? formatDaPublishedDate(parsed) : text,
  };
}

function readConfig(block) {
  const sectionData = block.closest('.section')?.dataset || {};

  const config = {
    layout: normalizeToken(
      'blogpost-layout',
      getConfigValue(
        block.dataset.blogpostLayout,
        sectionData,
        ['blogpostLayout', 'dataBlogpostLayout'],
        DEFAULTS.layout,
      ),
      ['classic', 'centered', 'magazine', 'splitcover'],
      DEFAULTS.layout,
    ),
    width: normalizeToken(
      'blogpost-width',
      getConfigValue(block.dataset.blogpostWidth, sectionData, ['blogpostWidth', 'dataBlogpostWidth'], DEFAULTS.width),
      ['default', 'wide'],
      DEFAULTS.width,
    ),
    style: normalizeToken(
      'blogpost-style',
      getConfigValue(block.dataset.blogpostStyle, sectionData, ['blogpostStyle', 'dataBlogpostStyle'], DEFAULTS.style),
      ['editorial', 'minimal'],
      DEFAULTS.style,
    ),
    tocstyle: normalizeToken(
      'blogpost-tocstyle',
      getConfigValue(block.dataset.blogpostTocstyle, sectionData, ['blogpostTocstyle', 'dataBlogpostTocstyle'], DEFAULTS.tocstyle),
      TOC_STYLES,
      DEFAULTS.tocstyle,
    ),
    showdescription: normalizeBoolean(
      'blogpost-showdescription',
      getConfigValue(block.dataset.blogpostShowdescription, sectionData, ['blogpostShowdescription', 'dataBlogpostShowdescription'], DEFAULTS.showdescription ? 'true' : 'false'),
      DEFAULTS.showdescription,
    ),
    showmeta: normalizeBoolean(
      'blogpost-showmeta',
      getConfigValue(block.dataset.blogpostShowmeta, sectionData, ['blogpostShowmeta', 'dataBlogpostShowmeta'], DEFAULTS.showmeta ? 'true' : 'false'),
      DEFAULTS.showmeta,
    ),
    showhero: normalizeBoolean(
      'blogpost-showhero',
      getConfigValue(block.dataset.blogpostShowhero, sectionData, ['blogpostShowhero', 'dataBlogpostShowhero'], DEFAULTS.showhero ? 'true' : 'false'),
      DEFAULTS.showhero,
    ),
    heroratio: normalizeToken(
      'blogpost-heroratio',
      getConfigValue(block.dataset.blogpostHeroratio, sectionData, ['blogpostHeroratio', 'dataBlogpostHeroratio'], DEFAULTS.heroratio),
      ['wide', 'landscape', 'square'],
      DEFAULTS.heroratio,
    ),
  };

  if (!config.showhero && getConfigValue(block.dataset.blogpostHeroratio, sectionData, ['blogpostHeroratio', 'dataBlogpostHeroratio'], '')) {
    warnNoOp('blogpost-heroratio', config.heroratio, 'Set blogpost-showhero=true to apply hero image sizing.');
  }

  return config;
}

function readPostMetadata() {
  const title = (
    getMetadata('title')
    || getMetadata('og:title')
    || document.title
    || ''
  ).trim();

  const meta = {
    title,
    description: (getMetadata('description') || '').trim(),
    image: sanitizeUrl(getMetadata('image') || getMetadata('og:image') || ''),
    authorimage: sanitizeUrl(getMetadata('authorimage') || ''),
    author: (getMetadata('author') || '').trim(),
    category: (getMetadata('category') || '').trim(),
    tags: (getMetadata('tags') || '').trim(),
  };

  if (!meta.title) warnMissingMetadata('title');
  if (!meta.description) warnMissingMetadata('description');
  if (!meta.author) warnMissingMetadata('author');
  if (!meta.category) warnMissingMetadata('category');

  return meta;
}

function extractAuthoredBody(block) {
  const body = document.createElement('div');
  body.className = 'blog-post-body';

  const rows = [...block.children];
  rows.forEach((row) => {
    const cells = [...row.children];
    cells.forEach((cell) => {
      const hasContent = [...cell.childNodes].some((node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim().length > 0;
        return true;
      });
      if (!hasContent) return;

      const section = document.createElement('div');
      section.className = 'blog-post-body-section';
      [...cell.childNodes].forEach((node) => {
        section.append(node.cloneNode(true));
      });
      body.append(section);
    });
  });

  return body.children.length ? body : null;
}

function createAuthorArea(meta) {
  const aside = document.createElement('aside');
  aside.className = 'blog-post-headaside';

  if (meta.author || meta.authorimage) {
    const author = document.createElement('p');
    author.className = 'blog-post-author';

    if (meta.authorimage) {
      const avatar = document.createElement('img');
      avatar.className = 'blog-post-author-avatar';
      avatar.src = meta.authorimage;
      avatar.alt = meta.author ? `${meta.author} avatar` : 'Author avatar';
      avatar.loading = 'lazy';
      avatar.decoding = 'async';
      author.append(avatar);
    }

    if (meta.author) {
      const name = document.createElement('span');
      name.className = 'blog-post-author-name';
      name.textContent = meta.author;
      author.append(name);
    }

    if (author.children.length) aside.append(author);
  }

  if (meta.published?.text) {
    const date = document.createElement('p');
    date.className = 'blog-post-date';

    const label = document.createElement('span');
    label.className = 'blog-post-date-label';
    label.textContent = 'Published';

    const value = document.createElement('time');
    value.className = 'blog-post-date-value';
    if (meta.published.dateTime) value.dateTime = meta.published.dateTime;
    value.textContent = meta.published.text;

    date.append(label, value);
    aside.append(date);
  }

  return aside.children.length ? aside : null;
}

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function createToc(body) {
  if (!body) return null;

  const headings = [...body.querySelectorAll('h2, h3, h4')];
  if (!headings.length) return null;

  const usedIds = new Set();
  const flatItems = headings
    .map((heading) => {
      const label = heading.textContent?.trim() || '';
      if (!label) return null;

      const base = slugify(label) || 'section';
      let id = base;
      let i = 2;
      while (usedIds.has(id) || document.getElementById(id)) {
        id = `${base}-${i}`;
        i += 1;
      }
      usedIds.add(id);
      heading.id = id;

      return {
        id,
        label,
        level: Number.parseInt(heading.tagName.slice(1), 10),
        children: [],
      };
    })
    .filter(Boolean);

  if (!flatItems.length) return null;

  const tree = [];
  let currentH2 = null;
  let currentH3 = null;

  flatItems.forEach((item) => {
    if (item.level === 2) {
      tree.push(item);
      currentH2 = item;
      currentH3 = null;
      return;
    }

    if (item.level === 3) {
      if (currentH2) {
        currentH2.children.push(item);
      } else {
        tree.push(item);
      }
      currentH3 = item;
      return;
    }

    if (item.level === 4) {
      if (currentH3) {
        currentH3.children.push(item);
      } else if (currentH2) {
        currentH2.children.push(item);
      } else {
        tree.push(item);
      }
    }
  });

  const nav = document.createElement('nav');
  nav.className = 'blog-post-toc';
  nav.setAttribute('aria-label', 'Table of contents');
  nav.dataset.expanded = 'true';

  const header = document.createElement('div');
  header.className = 'blog-post-toc-head';

  const title = document.createElement('p');
  title.className = 'blog-post-toc-title';
  title.textContent = 'On this page';
  header.append(title);

  const count = document.createElement('span');
  count.className = 'blog-post-toc-count';
  count.textContent = `${flatItems.length}`;
  header.append(count);

  const toggle = document.createElement('button');
  toggle.className = 'blog-post-toc-toggle';
  toggle.type = 'button';
  toggle.textContent = 'Toggle';
  header.append(toggle);

  nav.append(header);

  const progressTrack = document.createElement('div');
  progressTrack.className = 'blog-post-toc-progress-track';
  const progressBar = document.createElement('div');
  progressBar.className = 'blog-post-toc-progress-bar';
  progressTrack.append(progressBar);
  nav.append(progressTrack);

  const list = document.createElement('ol');
  list.className = 'blog-post-toc-list';
  const listId = `blog-post-toc-list-${Math.random().toString(36).slice(2, 8)}`;
  list.id = listId;
  toggle.setAttribute('aria-controls', listId);
  toggle.setAttribute('aria-expanded', 'true');

  const renderItems = (items, parent) => {
    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = `blog-post-toc-item blog-post-toc-item-h${item.level}`;

      const a = document.createElement('a');
      a.className = 'blog-post-toc-link';
      a.href = `#${item.id}`;
      a.textContent = item.label;

      li.append(a);

      if (item.children?.length) {
        const childList = document.createElement('ol');
        childList.className = 'blog-post-toc-list blog-post-toc-list-nested';
        renderItems(item.children, childList);
        li.append(childList);
      }

      parent.append(li);
    });
  };

  renderItems(tree, list);

  nav.append(list);
  return nav;
}

function initTocBehavior(block) {
  const toc = block.querySelector('.blog-post-toc');
  if (!toc) return;

  const tocList = toc.querySelector('.blog-post-toc-list');
  const tocToggle = toc.querySelector('.blog-post-toc-toggle');
  const tocProgressBar = toc.querySelector('.blog-post-toc-progress-bar');
  const body = block.querySelector('.blog-post-body');
  if (!tocList || !tocToggle || !body || !tocProgressBar) return;

  const updateMode = () => {
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    const expanded = !isMobile;
    toc.dataset.expanded = expanded ? 'true' : 'false';
    tocToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  tocToggle.addEventListener('click', () => {
    const nextExpanded = toc.dataset.expanded !== 'true';
    toc.dataset.expanded = nextExpanded ? 'true' : 'false';
    tocToggle.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
  });

  updateMode();
  window.addEventListener('resize', updateMode, { passive: true });

  const linkById = new Map();
  [...toc.querySelectorAll('.blog-post-toc-link')].forEach((link) => {
    const id = link.getAttribute('href')?.replace(/^#/, '');
    if (!id) return;
    linkById.set(id, link);
  });

  const setActive = (id) => {
    toc.querySelectorAll('.blog-post-toc-link.is-active').forEach((link) => {
      link.classList.remove('is-active');
    });
    toc.querySelectorAll('.blog-post-toc-item.is-active, .blog-post-toc-item.is-ancestor').forEach((item) => {
      item.classList.remove('is-active', 'is-ancestor');
    });
    const activeLink = linkById.get(id);
    if (!activeLink) return;
    activeLink.classList.add('is-active');
    const item = activeLink.closest('.blog-post-toc-item');
    if (!item) return;
    item.classList.add('is-active');
    item.closest('.blog-post-toc-item-h3, .blog-post-toc-item-h2')?.classList.add('is-ancestor');
  };

  [...toc.querySelectorAll('.blog-post-toc-link')].forEach((link) => {
    const id = link.getAttribute('href')?.replace(/^#/, '');
    if (!id) return;
    link.addEventListener('click', () => {
      setActive(id);
    });
  });

  const observedHeadings = [...body.querySelectorAll('h2[id], h3[id], h4[id]')];
  if (!observedHeadings.length) return;
  const lastHeadingId = observedHeadings[observedHeadings.length - 1]?.id || '';

  const navHeightRaw = getComputedStyle(document.documentElement).getPropertyValue('--nav-height').trim();
  const navHeight = Number.parseFloat(navHeightRaw) || 64;
  const anchorOffset = navHeight + 16;

  const getClosestHeadingId = () => {
    let closestPast = null;
    let firstAhead = null;

    observedHeadings.forEach((heading) => {
      const delta = heading.getBoundingClientRect().top - anchorOffset;
      if (delta <= 0) closestPast = heading;
      else if (!firstAhead) firstAhead = heading;
    });

    return (closestPast || firstAhead || observedHeadings[0])?.id;
  };

  const updateProgress = () => {
    const activeLink = toc.querySelector('.blog-post-toc-link.is-active');
    const activeId = activeLink?.getAttribute('href')?.replace(/^#/, '') || '';
    const atBottom = (
      window.innerHeight + window.scrollY
      >= document.documentElement.scrollHeight - 2
    );
    if (atBottom || (lastHeadingId && activeId === lastHeadingId)) {
      tocProgressBar.style.width = '100%';
      return;
    }

    const rect = body.getBoundingClientRect();
    const bodyTop = rect.top + window.scrollY;
    const start = bodyTop - anchorOffset;
    const total = Math.max(1, body.scrollHeight - (window.innerHeight * 0.55));
    const current = window.scrollY - start;
    const pct = Math.max(0, Math.min(100, (current / total) * 100));
    tocProgressBar.style.width = `${pct}%`;
  };

  let ticking = false;
  const onScrollLike = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      const id = getClosestHeadingId();
      if (id) setActive(id);
      updateProgress();
      ticking = false;
    });
  };

  window.addEventListener('scroll', onScrollLike, { passive: true });
  window.addEventListener('resize', onScrollLike, { passive: true });
  onScrollLike();
}

export default async function decorate(block) {
  const config = readConfig(block);
  const meta = readPostMetadata();
  meta.published = await resolveDaPublishedMeta();
  const authoredBody = extractAuthoredBody(block);

  block.dataset.blogpostLayout = config.layout;
  block.dataset.blogpostWidth = config.width;
  block.dataset.blogpostStyle = config.style;
  block.dataset.blogpostTocstyle = config.tocstyle;
  block.dataset.blogpostShowdescription = config.showdescription ? 'true' : 'false';
  block.dataset.blogpostShowmeta = config.showmeta ? 'true' : 'false';
  block.dataset.blogpostShowhero = config.showhero ? 'true' : 'false';
  block.dataset.blogpostHeroratio = config.heroratio;

  const wrapper = document.createElement('article');
  wrapper.className = 'blog-post-wrap';

  const header = document.createElement('header');
  header.className = 'blog-post-header';
  const main = document.createElement('div');
  main.className = 'blog-post-headmain';

  if (meta.category) {
    const category = document.createElement('p');
    category.className = 'blog-post-category';
    category.textContent = meta.category;
    main.append(category);
  }

  const title = document.createElement('h1');
  title.className = 'blog-post-title';
  title.textContent = meta.title || document.title || 'Untitled post';
  main.append(title);

  if (config.showdescription && meta.description) {
    const description = document.createElement('p');
    description.className = 'blog-post-description';
    description.textContent = meta.description;
    main.append(description);
  }

  header.append(main);

  if (config.showmeta) {
    const aside = createAuthorArea(meta);
    if (aside) header.append(aside);
  }

  wrapper.append(header);

  if (config.showhero && meta.image) {
    const figure = document.createElement('figure');
    figure.className = 'blog-post-hero';
    const picture = createOptimizedPicture(meta.image, meta.title || 'Blog post hero image', true, [
      { media: '(min-width: 1200px)', width: '2200' },
      { media: '(min-width: 768px)', width: '1400' },
      { width: '900' },
    ]);
    figure.append(picture);
    wrapper.append(figure);
  }

  if (config.showhero && !meta.image) {
    warnNoOp('blogpost-showhero', 'true', 'Set page metadata "image" to render a hero image.');
  }

  if (authoredBody) {
    const content = document.createElement('div');
    content.className = 'blog-post-content';
    content.append(authoredBody);

    const toc = createToc(authoredBody);
    if (toc) {
      toc.dataset.blogpostTocstyle = config.tocstyle;
      content.append(toc);
    }

    wrapper.append(content);
  }

  block.replaceChildren(wrapper);
  initTocBehavior(block);
}
