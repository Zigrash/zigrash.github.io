(() => {
  document.querySelectorAll('[data-process-carousel]').forEach(carousel => {
    const images = [...carousel.querySelectorAll('[data-carousel-image]')];
    const slider = carousel.querySelector('input[type="range"]');
    const output = carousel.querySelector('output');
    const controls = carousel.querySelector('.carousel-controls');
    if (!images.length || !slider || !output || !controls) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = value => Math.max(1, Math.min(images.length, Number(value) || 1));
    let position = clamp(slider.value);
    let target = position;
    let frame = 0;
    let lastTime = null;
    const describe = value => {
      const lower = Math.floor(value - 1);
      const blend = value - 1 - lower;
      if (blend < .005 || blend > .995) {
        const index = Math.round(value - 1);
        return `${images[index].dataset.stage} (${index + 1} / ${images.length})`;
      }
      return `${images[lower].dataset.stage} → ${images[lower + 1].dataset.stage} · ${Math.round(blend * 100)}%`;
    };
    const render = () => {
      const lower = Math.floor(position - 1);
      const upper = Math.min(lower + 1, images.length - 1);
      const blend = position - 1 - lower;
      images.forEach((image, index) => {
        image.hidden = index !== lower && !(index === upper && blend > 0);
        // An opaque lower layer plus a translucent upper layer gives a linear crossfade.
        image.style.opacity = index === lower ? '1' : index === upper ? String(blend) : '0';
        image.style.zIndex = index === upper && upper !== lower ? '2' : '1';
        image.setAttribute('aria-hidden', String(index !== Math.round(position - 1)));
      });
      output.value = describe(position);
    };
    const animate = now => {
      const elapsed = lastTime === null ? 16.7 : Math.min(64, Math.max(0, now - lastTime));
      lastTime = now;
      position += (target - position) * (1 - Math.exp(-elapsed / 65));
      if (Math.abs(target - position) < .0001) position = target;
      render();
      if (position !== target) frame = requestAnimationFrame(animate);
      else { frame = 0; lastTime = null; }
    };
    const update = () => {
      target = clamp(slider.value);
      const progress = images.length > 1 ? (target - 1) / (images.length - 1) * 100 : 0;
      slider.style.setProperty('--slider-progress', `${progress}%`);
      slider.setAttribute('aria-valuetext', describe(target));
      if (reducedMotion) { position = target; render(); }
      else if (!frame && position !== target) frame = requestAnimationFrame(animate);
    };
    slider.max = String(images.length);
    slider.step = 'any';
    slider.addEventListener('input', update);
    // Keep operating the slider separate from drawing on the picture.
    slider.addEventListener('pointerdown', event => event.stopPropagation());
    render();
    update();
    controls.hidden = false;
  });
})();
