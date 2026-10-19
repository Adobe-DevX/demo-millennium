const DEFAULT_LOGO_ALT = 'Millennium Hotels and Resorts';

// /content/dam paths are served by AEM publish, not by the EDS or aem up host.
const AEM_PUBLISH_ORIGIN = 'https://publish-p232534-e2346309.adobeaemcloud.com';

function decorateLogo(row, alt) {
  const img = row.querySelector('img');
  if (img) {
    img.alt = alt;
    return;
  }

  const link = row.querySelector('a[href]');
  if (!link) return;

  const href = link.getAttribute('href');
  const fallbackImg = document.createElement('img');
  fallbackImg.src = href.startsWith('/content/dam/') ? `${AEM_PUBLISH_ORIGIN}${href}` : link.href;
  fallbackImg.alt = alt;
  link.replaceWith(fallbackImg);
}

function hasLogoContent(row) {
  return Boolean(row.querySelector('picture, img, a[href]'));
}

// Universal Editor omits empty text fields, so the logo-alt row can be missing and
// row positions shift. Richtext rows are always present, so they are counted from the end.
function labelRows(block) {
  const rows = [...block.children];
  const tail = rows.splice(-3);
  const named = {};
  if (rows.length === 2) {
    [named.logo, named['logo-alt']] = rows;
  } else if (rows.length === 1) {
    const [single] = rows;
    if (hasLogoContent(single)) named.logo = single;
    else named['logo-alt'] = single;
  }
  [named.text, named.actions, named['book-now']] = tail;
  Object.entries(named).forEach(([name, row]) => row?.classList.add(`rewards-intro-${name}`));
  return named;
}

export default function decorate(block) {
  const rowsByName = labelRows(block);

  const altRow = rowsByName['logo-alt'];
  const alt = altRow?.textContent.trim() || DEFAULT_LOGO_ALT;
  if (rowsByName.logo) decorateLogo(rowsByName.logo, alt);
  altRow?.remove();

  rowsByName.actions?.querySelectorAll('a[href]').forEach((link, index) => {
    link.classList.add(index === 0 ? 'rewards-intro-cta' : 'rewards-intro-link');
  });

  const bookNow = rowsByName['book-now'];
  if (bookNow) {
    bookNow.querySelectorAll('a[href]').forEach((link) => link.classList.add('rewards-intro-book-title'));
    bookNow.querySelectorAll('p').forEach((p) => {
      if (!p.querySelector('a')) p.classList.add('rewards-intro-book-sub');
    });
  }
}
