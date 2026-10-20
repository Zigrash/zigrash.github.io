(() => {
  const container = document.querySelector('[data-self-trailer]');
  if (!container || !['https:', 'http:'].includes(location.protocol)) return;
  const frame = document.createElement('iframe');
  const videoId = container.dataset.videoId || 'koEYRXdHkAg';
  if (!/^[\w-]{11}$/.test(videoId)) return;
  frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0`;
  frame.title = container.dataset.videoTitle || 'Self Teaser Trailer #1';
  frame.loading = 'lazy';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  container.replaceChildren(frame);
})();
