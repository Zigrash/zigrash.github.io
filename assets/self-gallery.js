(() => {
  const links = [...document.querySelectorAll('.self-gallery a')];
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;
  const dialog = document.createElement('dialog');
  dialog.className = 'self-zoom';
  dialog.setAttribute('aria-label', 'Breakdown image viewer');
  dialog.innerHTML = `<div class="self-zoom-bar"><button type="button" data-action="out" aria-label="Zoom out">−</button><output aria-live="polite"></output><button type="button" data-action="in" aria-label="Zoom in">+</button><button type="button" data-action="fit">Fit screen</button><button type="button" data-action="actual">Full resolution</button><button type="button" class="zoom-close" data-action="close">Close ×</button></div><div class="self-zoom-scroll" tabindex="0" aria-label="Image; scroll to explore when zoomed"><img alt=""></div>`;
  document.body.append(dialog);
  const img = dialog.querySelector('img');
  const viewport = dialog.querySelector('.self-zoom-scroll');
  const output = dialog.querySelector('output');
  let scale = 1;
  let originalWidth = 1920;
  let originalHeight = 1080;
  const render = () => {
    img.style.width = `${originalWidth * scale}px`;
    output.value = `${Math.round(scale * 100)}%`;
  };
  const fit = () => {
    scale = Math.min(1, (viewport.clientWidth - 24) / originalWidth, (viewport.clientHeight - 24) / originalHeight);
    render();
  };
  links.forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    img.src = link.href;
    const thumbnail = link.querySelector('img');
    img.alt = thumbnail.alt;
    originalWidth = Number(thumbnail.getAttribute('width')) || thumbnail.naturalWidth || 1920;
    originalHeight = Number(thumbnail.getAttribute('height')) || thumbnail.naturalHeight || 1080;
    dialog.showModal();
    fit();
    viewport.scrollTo(0, 0);
  }));
  dialog.addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.action;
    if (action === 'close') dialog.close();
    else if (action === 'fit') fit();
    else if (action === 'actual') { scale = 1; render(); }
    else if (action === 'in' || action === 'out') {
      scale = Math.max(.2, Math.min(3, scale * (action === 'in' ? 1.25 : .8)));
      render();
    }
  });
})();
