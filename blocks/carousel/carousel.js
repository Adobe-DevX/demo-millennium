import { moveInstrumentation } from '../../scripts/scripts.js';

const ARROWS = {
  prev: { label: 'Previous slide', path: 'M52 12H4M10 6l-6 6 6 6' },
  next: { label: 'Next slide', path: 'M4 12h48M46 6l6 6-6 6' },
};

function createArrow(direction) {
  const { label, path } = ARROWS[direction];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `carousel-arrow carousel-arrow-${direction}`;
  button.setAttribute('aria-label', label);
  button.innerHTML = `<svg viewBox="0 0 56 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
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

  const currentIndex = () => Math.round(track.scrollLeft / track.clientWidth);
  // jump straight to the target slide so only the image and card change, with no sliding
  const goTo = (index) => {
    const last = track.children.length - 1;
    const target = Math.min(Math.max(index, 0), last);
    track.scrollTo({ left: target * track.clientWidth, behavior: 'instant' });
  };
  prev.addEventListener('click', () => goTo(currentIndex() - 1));
  next.addEventListener('click', () => goTo(currentIndex() + 1));

  const refresh = () => updateArrows(track, prev, next);
  track.addEventListener('scroll', refresh, { passive: true });
  // sections are hidden while their blocks decorate, so track size only becomes real later
  new ResizeObserver(refresh).observe(track);
  refresh();
}
