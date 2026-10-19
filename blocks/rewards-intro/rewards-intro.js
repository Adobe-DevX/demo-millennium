const ROW_NAMES = ['logo', 'logo-alt', 'text', 'actions', 'book-now'];
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

export default function decorate(block) {
  const rowsByName = {};
  [...block.children].forEach((row, index) => {
    const name = ROW_NAMES[index];
    if (!name) return;
    row.classList.add(`rewards-intro-${name}`);
    rowsByName[name] = row;
  });

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
