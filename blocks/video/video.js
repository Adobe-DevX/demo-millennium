const VIDEO_TYPES = {
  mp4: 'video/mp4',
  webm: 'video/webm',
};

// /content/dam paths are served by AEM publish, not by the EDS or aem up host.
const AEM_PUBLISH_ORIGIN = 'https://publish-p232534-e2346309.adobeaemcloud.com';

function getExtension(href) {
  return new URL(href, window.location.href).pathname.split('.').pop().toLowerCase();
}

function getSourceUrl(link) {
  const path = link.getAttribute('href');
  return path.startsWith('/content/dam/') ? `${AEM_PUBLISH_ORIGIN}${path}` : link.href;
}

function getAccessibleLabel(block) {
  const textCell = [...block.querySelectorAll(':scope > div > div')]
    .find((cell) => !cell.querySelector('a, picture, img'));
  return textCell?.textContent.trim() || 'Video';
}

function autoplayWhenVisible(video) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let hasAutoplayed = false;
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !hasAutoplayed) {
      hasAutoplayed = true;
      video.play().catch(() => {});
    } else if (!entry.isIntersecting && !video.paused) {
      video.pause();
    }
  }, { threshold: 0.5 });
  observer.observe(video);
}

export default function decorate(block) {
  const links = [...block.querySelectorAll('a[href]')];
  const videoLink = links.find((link) => VIDEO_TYPES[getExtension(link.href)]) || links[0];
  const posterImg = block.querySelector('picture img');

  const video = document.createElement('video');
  video.controls = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-label', getAccessibleLabel(block));
  if (posterImg) video.poster = posterImg.src;

  if (videoLink) {
    const source = document.createElement('source');
    source.src = getSourceUrl(videoLink);
    const type = VIDEO_TYPES[getExtension(videoLink.href)];
    if (type) source.type = type;
    video.append(source);
  }

  block.replaceChildren(video);
  autoplayWhenVisible(video);
}
