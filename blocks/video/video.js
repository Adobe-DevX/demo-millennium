const VIDEO_TYPES = {
  mp4: 'video/mp4',
  webm: 'video/webm',
};

// /content/dam paths are served by AEM publish, not by the EDS or aem up host.
const AEM_PUBLISH_ORIGIN = 'https://publish-p232534-e2346309.adobeaemcloud.com';

// Dynamic Media delivery URL of a video asset, e.g. /adobe/assets/urn:aaid:aem:<id>
const DM_ASSET_PATH = /^\/adobe\/assets\/urn:aaid:[^/]+(\/play)?$/;

function getExtension(href) {
  return new URL(href, window.location.href).pathname.split('.').pop().toLowerCase();
}

function getSourceUrl(link) {
  const path = link.getAttribute('href');
  return path.startsWith('/content/dam/') ? `${AEM_PUBLISH_ORIGIN}${path}` : link.href;
}

function isDynamicMediaAsset(href) {
  return DM_ASSET_PATH.test(new URL(href, window.location.href).pathname);
}

// Dynamic Media serves an HLS/DASH player at <asset>/play, which a native video element cannot play
function getPlayerUrl(href) {
  const url = new URL(href, window.location.href);
  url.search = '';
  url.pathname = url.pathname.endsWith('/play') ? url.pathname : `${url.pathname}/play`;
  return url.href;
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
  const label = getAccessibleLabel(block);

  if (videoLink && isDynamicMediaAsset(videoLink.href)) {
    const player = document.createElement('iframe');
    player.src = getPlayerUrl(videoLink.href);
    player.title = label;
    player.allow = 'fullscreen; picture-in-picture';
    player.allowFullscreen = true;
    player.loading = 'lazy';
    block.replaceChildren(player);
    return;
  }

  const posterImg = block.querySelector('picture img');

  const video = document.createElement('video');
  video.controls = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-label', label);
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
