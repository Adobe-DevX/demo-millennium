const AUTHOR_HOST_PATTERN = /^author-p\d+-e\d+\.adobeaemcloud\.com$/;
const PUBLISH_ORIGIN = 'https://publish-p232534-e2346309.adobeaemcloud.com';
const QUERY_PATH = '/graphql/execute.json/millennium-hotels/millenniumOffersBySlug';
const BANNER_WIDTHS = [750, 1200, 2000];
const BANNER_QUALITY = 80;

const TEXT_FORMATS = {
  strong: 'strong',
  bold: 'strong',
  emphasis: 'em',
  italic: 'em',
  underline: 'u',
  strikethrough: 's',
  subscript: 'sub',
  superscript: 'sup',
  code: 'code',
};

function isAuthor() {
  return AUTHOR_HOST_PATTERN.test(window.location.hostname);
}

function slugFromPath(pathname) {
  return pathname.replace(/\.html$/, '').split('/').filter(Boolean).pop() || '';
}

function readSlug(block) {
  const authored = block.querySelector(':scope > div > div')?.textContent.trim();
  return authored || decodeURIComponent(slugFromPath(window.location.pathname));
}

async function fetchOffer(slug) {
  const author = isAuthor();
  const query = `${QUERY_PATH};slug=${encodeURIComponent(slug)}`;
  // a per-origin cache key keeps the publish CDN from serving copies cached without CORS headers
  const url = author
    ? `${window.location.origin}${query}`
    : `${PUBLISH_ORIGIN}${query}?origin=${encodeURIComponent(window.location.origin)}`;
  const options = { credentials: author ? 'include' : 'omit' };
  let resp;
  try {
    resp = await fetch(url, options);
  } catch (e) {
    resp = await fetch(`${url}${url.includes('?') ? '&' : '?'}ts=${Date.now()}`, options);
  }
  if (!resp.ok) throw new Error(`Failed to fetch offer: ${resp.status}`);
  const json = await resp.json();
  return json?.data?.millenniumOffersList?.items?.[0] || null;
}

function buildBanner(image, alt, eager) {
  const picture = document.createElement('picture');
  const img = document.createElement('img');
  img.alt = alt;
  img.width = 1200;
  img.height = 800;
  img.loading = eager ? 'eager' : 'lazy';
  if (eager) img.fetchPriority = 'high';

  // eslint-disable-next-line no-underscore-dangle
  const dynamicUrl = image?._dynamicUrl;
  if (dynamicUrl && !isAuthor()) {
    const base = `${PUBLISH_ORIGIN}${dynamicUrl.split('?')[0].replace(/\.[^./]+$/, '')}`;
    const variant = (format, width) => `${base}.${format}?width=${width}&quality=${BANNER_QUALITY}`;
    const source = document.createElement('source');
    source.type = 'image/webp';
    source.srcset = BANNER_WIDTHS.map((w) => `${variant('webp', w)} ${w}w`).join(', ');
    source.sizes = '100vw';
    picture.append(source);
    img.src = variant('jpg', 1200);
  } else {
    // eslint-disable-next-line no-underscore-dangle
    const path = image?._path;
    if (!path) return null;
    img.src = `${isAuthor() ? window.location.origin : PUBLISH_ORIGIN}${path}`;
  }

  picture.append(img);
  return picture;
}

function safeHref(href) {
  if (!href) return '';
  try {
    const url = new URL(href, window.location.href);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? href : '';
  } catch (e) {
    return '';
  }
}

function renderInline(nodes, minHeadingLevel) {
  const fragment = document.createDocumentFragment();
  // eslint-disable-next-line no-use-before-define
  (nodes || []).forEach((node) => fragment.append(renderNode(node, minHeadingLevel)));
  return fragment;
}

function renderText(node) {
  let el = document.createTextNode(node.value || '');
  (node.format?.variants || []).forEach((variant) => {
    const tag = TEXT_FORMATS[variant];
    if (!tag) return;
    const wrapper = document.createElement(tag);
    wrapper.append(el);
    el = wrapper;
  });
  return el;
}

/**
 * Renders AEM content fragment rich text JSON into semantic DOM, dropping the
 * inline formatting authors pasted from other sites.
 */
function renderNode(node, minHeadingLevel) {
  const children = () => renderInline(node.content, minHeadingLevel);
  switch (node?.nodeType) {
    case 'text':
      return renderText(node);
    case 'line-break':
      return document.createElement('br');
    case 'paragraph': {
      const p = document.createElement('p');
      p.append(children());
      return p;
    }
    case 'header': {
      const level = Number(String(node.style || '').match(/[1-6]/)?.[0] || 2);
      const h = document.createElement(`h${Math.min(Math.max(level, minHeadingLevel), 6)}`);
      h.append(children());
      return h;
    }
    case 'unordered-list':
    case 'ordered-list': {
      const list = document.createElement(node.nodeType === 'ordered-list' ? 'ol' : 'ul');
      list.append(children());
      return list;
    }
    case 'list-item': {
      const li = document.createElement('li');
      li.append(children());
      return li;
    }
    case 'link': {
      const href = safeHref(node.data?.href);
      if (!href) return children();
      const a = document.createElement('a');
      a.href = href;
      if (node.data?.target === '_blank') {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      a.append(children());
      return a;
    }
    default:
      return children();
  }
}

function renderDetails(details, minHeadingLevel) {
  const wrapper = document.createElement('div');
  wrapper.className = 'offer-detail-description';
  (details?.json || []).forEach((node) => {
    const el = renderNode(node, minHeadingLevel);
    if (el.nodeType === Node.ELEMENT_NODE && !el.textContent.trim()) return;
    wrapper.append(el);
  });

  wrapper.querySelectorAll('p').forEach((p) => {
    const links = p.querySelectorAll('a');
    if (links.length === 1 && links[0].textContent.trim() === p.textContent.trim()) {
      links[0].className = 'button';
      p.className = 'button-wrapper';
    }
  });
  return wrapper;
}

function renderMessage(block, message) {
  block.removeAttribute('aria-busy');
  if (!message) {
    block.replaceChildren();
    return;
  }
  const p = document.createElement('p');
  p.className = 'offer-detail-message';
  p.textContent = message;
  block.replaceChildren(p);
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const slug = readSlug(block);
  const titleLevel = document.querySelector('main h1') ? 2 : 1;
  const firstSection = document.querySelector('main .section');
  const eager = !!firstSection?.contains(block);

  block.setAttribute('aria-busy', 'true');
  block.replaceChildren();

  if (!slug) {
    renderMessage(block, isAuthor() ? 'Enter an offer slug or name this page after one.' : '');
    return;
  }

  let offer;
  try {
    offer = await fetchOffer(slug);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('offer-detail:', e);
    renderMessage(block, 'This offer is currently unavailable. Please try again later.');
    return;
  }

  if (!offer) {
    renderMessage(block, isAuthor()
      ? `No offer found with slug "${slug}".`
      : 'This offer is no longer available.');
    return;
  }

  const title = offer.title?.trim() || '';
  const banner = buildBanner(offer.bannerImage, title, eager);
  if (banner) {
    const bannerWrapper = document.createElement('div');
    bannerWrapper.className = 'offer-detail-banner';
    bannerWrapper.append(banner);
    block.append(bannerWrapper);
  }

  const content = document.createElement('div');
  content.className = 'offer-detail-content';
  if (title) {
    const heading = document.createElement(`h${titleLevel}`);
    heading.textContent = title;
    content.append(heading);
  }
  content.append(renderDetails(offer.details, titleLevel + 1));
  block.append(content);
  block.removeAttribute('aria-busy');
}
