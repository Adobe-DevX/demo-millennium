const AUTHOR_HOST_PATTERN = /^author-p\d+-e\d+\.adobeaemcloud\.com$/;
const PUBLISH_ORIGIN = 'https://publish-p232534-e2346309.adobeaemcloud.com';
const QUERY_PATH = '/graphql/execute.json/millennium-hotels/MillenniumOffersListAll';
const DEFAULT_CTA_LABEL = 'Find out more';
const ALL = '';

let instanceCount = 0;

function isAuthor() {
  return AUTHOR_HOST_PATTERN.test(window.location.hostname);
}

function getOrigin() {
  return isAuthor() ? window.location.origin : PUBLISH_ORIGIN;
}

async function fetchOffers() {
  const author = isAuthor();
  // a per-origin cache key keeps the publish CDN from serving copies cached without CORS headers
  const url = author
    ? `${window.location.origin}${QUERY_PATH}`
    : `${PUBLISH_ORIGIN}${QUERY_PATH}?origin=${encodeURIComponent(window.location.origin)}`;
  const options = { credentials: author ? 'include' : 'omit' };
  let resp;
  try {
    resp = await fetch(url, options);
  } catch (e) {
    resp = await fetch(`${url}${url.includes('?') ? '&' : '?'}ts=${Date.now()}`, options);
  }
  if (!resp.ok) throw new Error(`Failed to fetch offers: ${resp.status}`);
  const json = await resp.json();
  return json?.data?.millenniumOffersList?.items || [];
}

function readConfig(block) {
  const [regionRow, offerTypeRow, ctaRow] = [...block.children];
  const text = (row) => row?.textContent.trim() || '';
  const link = ctaRow?.querySelector('a');
  return {
    region: text(regionRow),
    offerType: text(offerTypeRow),
    ctaBasePath: link?.getAttribute('href') || text(ctaRow),
  };
}

function buildOfferUrl(basePath, slug) {
  if (!basePath || !slug) return '';
  const [path, hash] = basePath.split('#');
  const isHtml = path.endsWith('.html');
  const base = path.replace(/\.html$/, '').replace(/\/$/, '');
  return `${base}/${encodeURIComponent(slug)}${isHtml ? '.html' : ''}${hash ? `#${hash}` : ''}`;
}

function buildPicture(image, alt) {
  const picture = document.createElement('picture');
  const img = document.createElement('img');
  img.alt = alt;
  img.loading = 'lazy';
  img.width = 750;
  img.height = 750;

  // eslint-disable-next-line no-underscore-dangle
  const dynamicUrl = image?._dynamicUrl;
  if (dynamicUrl && !isAuthor()) {
    const base = `${PUBLISH_ORIGIN}${dynamicUrl.replace(/\.[^./]+$/, '')}`;
    const source = document.createElement('source');
    source.type = 'image/webp';
    source.srcset = `${base}.webp?width=500 500w, ${base}.webp?width=750 750w`;
    source.sizes = '(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw';
    picture.append(source);
    img.src = `${base}.jpg?width=750`;
  } else {
    /* eslint-disable no-underscore-dangle */
    const src = (isAuthor() ? image?._authorUrl : image?._publishUrl)
      || (image?._path ? `${getOrigin()}${image._path}` : '');
    /* eslint-enable no-underscore-dangle */
    if (!src) return null;
    img.src = src;
  }

  picture.append(img);
  return picture;
}

function buildCard(offer, ctaBasePath) {
  const title = offer.title?.trim() || '';
  const li = document.createElement('li');
  li.className = 'offers-listing-card';

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'offers-listing-card-image';
  const picture = buildPicture(offer.thumbnailImage, title);
  if (picture) imageWrapper.append(picture);
  li.append(imageWrapper);

  const body = document.createElement('div');
  body.className = 'offers-listing-card-body';
  const heading = document.createElement('h3');
  heading.textContent = title;
  body.append(heading);

  if (offer.shortDescription) {
    const description = document.createElement('p');
    description.className = 'offers-listing-card-description';
    description.textContent = offer.shortDescription.trim();
    body.append(description);
  }

  const href = buildOfferUrl(ctaBasePath, offer.slug);
  if (href) {
    const cta = document.createElement('a');
    cta.className = 'offers-listing-card-cta';
    cta.href = href;
    cta.textContent = offer.ctaLabel?.trim() || DEFAULT_CTA_LABEL;
    cta.setAttribute('aria-label', `${cta.textContent}: ${title}`);
    body.append(cta);
  }

  li.append(body);
  return li;
}

function uniqueValues(offers, key) {
  return [...new Set(offers.map((o) => o[key]?.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function matchOption(values, preferred) {
  return values.find((v) => v.toLowerCase() === preferred.toLowerCase()) || ALL;
}

function buildSelect(id, labelText, allLabel, values, selected) {
  const wrapper = document.createElement('div');
  wrapper.className = 'offers-listing-filter';

  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;

  const select = document.createElement('select');
  select.id = id;
  [[ALL, allLabel], ...values.map((v) => [v, v])].forEach(([value, text]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    option.selected = value === selected;
    select.append(option);
  });

  wrapper.append(label, select);
  return { wrapper, select };
}

function renderMessage(container, message) {
  const p = document.createElement('p');
  p.className = 'offers-listing-message';
  p.textContent = message;
  container.replaceChildren(p);
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  instanceCount += 1;
  const config = readConfig(block);

  const filters = document.createElement('form');
  filters.className = 'offers-listing-filters';
  filters.addEventListener('submit', (e) => e.preventDefault());

  const results = document.createElement('div');
  results.className = 'offers-listing-results';
  results.setAttribute('aria-live', 'polite');
  results.setAttribute('aria-busy', 'true');

  block.replaceChildren(filters, results);

  let offers;
  try {
    offers = await fetchOffers();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('offers-listing:', e);
    results.removeAttribute('aria-busy');
    renderMessage(results, 'Offers are currently unavailable. Please try again later.');
    return;
  }

  const regions = uniqueValues(offers, 'region');
  const offerTypes = uniqueValues(offers, 'offerType');
  const region = buildSelect(
    `offers-listing-region-${instanceCount}`,
    'Show Offers From',
    'All Regions',
    regions,
    matchOption(regions, config.region),
  );
  const offerType = buildSelect(
    `offers-listing-type-${instanceCount}`,
    'and',
    'All Offers',
    offerTypes,
    matchOption(offerTypes, config.offerType),
  );
  filters.replaceChildren(region.wrapper, offerType.wrapper);

  const render = () => {
    const selectedRegion = region.select.value;
    const selectedType = offerType.select.value;
    const filtered = offers.filter((o) => (
      (selectedRegion === ALL || o.region?.trim() === selectedRegion)
      && (selectedType === ALL || o.offerType?.trim() === selectedType)
    ));

    if (!filtered.length) {
      renderMessage(results, 'No offers match your selection.');
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'offers-listing-grid';
    filtered.forEach((offer) => ul.append(buildCard(offer, config.ctaBasePath)));
    results.replaceChildren(ul);
  };

  region.select.addEventListener('change', render);
  offerType.select.addEventListener('change', render);
  render();
  results.removeAttribute('aria-busy');
}
