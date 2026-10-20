// Steam's HLS streams carry separate audio tracks; use the full hls.js build.
(() => {
  document.querySelectorAll('video[data-steam-hls]').forEach(video => {
    const source = video.dataset.steamHls;
    const message = video.closest('.steam-trailer').querySelector('.trailer-error');
    const showError = () => { if (message) message.hidden = false; };
    video.addEventListener('error', showError);
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
      return;
    }
    if (!window.Hls?.isSupported()) {
      showError();
      return;
    }
    const player = new window.Hls({ autoStartLoad: false, maxBufferLength: 20 });
    player.on(window.Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      showError();
      player.destroy();
    });
    player.loadSource(source);
    player.attachMedia(video);
    // Wait for the visitor to play before downloading video segments.
    video.addEventListener('play', () => player.startLoad(), { once: true });
    window.addEventListener('pagehide', event => {
      if (!event.persisted) player.destroy();
    });
  });
})();
