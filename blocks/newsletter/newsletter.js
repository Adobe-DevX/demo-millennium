import { decorateIcons } from '../../scripts/aem.js';

const PLACEHOLDER = 'Subscribe to our newsletter';

function decorateFollow(row) {
  row.querySelectorAll('a[href]').forEach((link) => {
    const name = link.textContent.trim();
    const icon = document.createElement('span');
    icon.className = `icon icon-${name.toLowerCase()}`;
    link.setAttribute('aria-label', name);
    link.replaceChildren(icon);
  });
  decorateIcons(row);
  row.querySelector('p:not(:has(a))')?.classList.add('newsletter-title');
}

function decorateSignup(row) {
  const cell = row.firstElementChild || row;
  const [title, ...consent] = [...cell.children];

  const form = document.createElement('form');
  form.className = 'newsletter-form';
  // No subscription endpoint is configured yet.
  form.addEventListener('submit', (event) => event.preventDefault());

  const field = document.createElement('div');
  field.className = 'newsletter-field';
  const input = document.createElement('input');
  input.type = 'email';
  input.name = 'email';
  input.placeholder = PLACEHOLDER;
  input.setAttribute('aria-label', PLACEHOLDER);
  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Subscribe';
  field.append(input, button);

  const consentLabel = document.createElement('label');
  consentLabel.className = 'newsletter-consent';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  const text = document.createElement('span');
  text.innerHTML = consent.map((p) => p.innerHTML).join(' ');
  consentLabel.append(checkbox, text);

  title?.classList.add('newsletter-title');
  form.append(field, consentLabel);
  cell.replaceChildren(...(title ? [title] : []), form);
}

export default function decorate(block) {
  const [follow, signup] = block.children;
  if (follow) decorateFollow(follow);
  if (signup) decorateSignup(signup);
}
