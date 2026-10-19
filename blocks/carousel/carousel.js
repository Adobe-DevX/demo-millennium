import { moveInstrumentation } from '../../scripts/scripts.js';

const ARROWS = {
  prev: { label: 'Previous slide', path: 'M20 12H4M10 6l-6 6 6 6' },
  next: { label: 'Next slide', path: 'M4 12h16M14 6l6 6-6 6' },
};

function createArrow(direction) {
  const { label, path } = ARROWS[direction];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `carousel-arrow carousel-arrow-${direction}`;
  button.setAttribute('aria-label', label);
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
  return button;
}

function updateArrows(track, prev, next) {
  const maxScroll = track.scrollWidth - track.clientWidth;
  prev.disabled = track.scrollLeft <= 1;
  next.disabled = track.scrollLeft >= maxScroll - 1;
}

export default function decorate(block) {
  const track = document.createElement('div');
  track.className = 'carousel-track';

  // each authored row becomes one slide, so its image and card slide together as one unit
  [...block.children].forEach((row) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    moveInstrumentation(row, slide);

    const [imageCell, textCell] = row.children;
    const cardRow = document.createElement('div');
    if (textCell) cardRow.append(textCell);
    if (imageCell) slide.append(imageCell);
    slide.append(cardRow);
    track.append(slide);
  });

  block.replaceChildren(track);
  if (track.children.length < 2) return;

  const prev = createArrow('prev');
  const next = createArrow('next');
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  controls.append(prev, next);
  block.append(controls);

  prev.addEventListener('click', () => {
    track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' });
  });
  next.addEventListener('click', () => {
    track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
  });

  const refresh = () => updateArrows(track, prev, next);
  track.addEventListener('scroll', refresh, { passive: true });
  window.addEventListener('resize', refresh);
  refresh();
}
