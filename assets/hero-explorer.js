(() => {
  const hero = document.querySelector('.hero');
  const stage = hero?.querySelector('.hero-explorer');
  const canvas = stage?.querySelector('canvas');
  const ctx = canvas?.getContext('2d', { alpha: false });
  if (!hero || !stage || !ctx) return;

  const logo = new Image();
  const mask = document.createElement('canvas');
  const maskContext = mask.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => {
    const x = clamp(value);
    return x * x * (3 - 2 * x);
  };
  const lerp = (a, b, amount) => a + (b - a) * amount;

  let seed = 427;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const dust = Array.from({ length: 95 }, () => ({
    x: random(), y: random(), z: random(), r: .3 + random() * 1.1
  }));

  let width = 0;
  let height = 0;
  let elapsed = 0;
  let lastFrame = 0;
  let frameId = 0;
  let visible = false;
  let ready = false;
  let observer;

  function resize() {
    if (!ready) return;
    const bounds = stage.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw(reducedMotion.matches ? 8 : Math.min(elapsed / 1000, 8));
  }

  function draw(time) {
    const mobile = width <= 720;
    const centerX = width * .5;
    const centerY = height * (mobile ? .34 : .35);
    const arrival = smooth((time - 1.7) / 3.8);
    const settle = smooth((time - 5.4) / 1.9);
    const fade = 1 - settle;

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#060809';
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * .48);
    glow.addColorStop(0, `rgba(83,111,120,${.12 * fade})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = .18 * smooth(time / .8) * fade;
    ctx.strokeStyle = '#536e78';
    ctx.lineWidth = .65;
    const horizon = height * .55;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX + i * 7, horizon);
      ctx.lineTo(centerX + i * width * .19, height);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const depth = (i / 12 + time * .055) % 1;
      const y = horizon + (height - horizon) * depth * depth;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    for (const particle of dust) {
      ctx.globalAlpha = (.08 + particle.z * .25) * fade * smooth(time);
      ctx.fillStyle = '#c3d5db';
      const x = (particle.x * width + (particle.x - .5) * time * 11 * particle.z + width) % width;
      const y = (particle.y * height - time * (2 + particle.z * 6) + height) % height;
      ctx.fillRect(x, y, particle.r, particle.r);
    }
    ctx.restore();

    const size = Math.min(width * (mobile ? .6 : .46), height * (mobile ? .4 : .52), 560) * lerp(1.13, 1, arrival);
    const logoHeight = size * logo.height / logo.width;
    const left = centerX - size / 2;
    const top = centerY - logoHeight / 2;
    ctx.save();
    ctx.globalAlpha = smooth((time - .9) / 4.7);
    ctx.shadowColor = '#abcbd8';
    ctx.shadowBlur = 13 * Math.sin(arrival * Math.PI);
    ctx.drawImage(mask, left, top, size, logoHeight);
    ctx.restore();

    if (time > 1.4 && time < 5.6) {
      ctx.save();
      const sweep = lerp(left - size * .2, left + size * 1.2, clamp((time - 1.4) / 4.2));
      ctx.beginPath();
      ctx.rect(sweep - size * .075, top, size * .15, logoHeight);
      ctx.clip();
      ctx.globalAlpha = .75 * Math.sin(clamp((time - 1.4) / 4.2) * Math.PI);
      ctx.drawImage(mask, left, top, size, logoHeight);
      ctx.restore();
    }

    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .25,
      width / 2, height / 2, Math.max(width, height) * .7);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function stop() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = 0;
  }

  function frame(now) {
    frameId = 0;
    if (lastFrame) elapsed += now - lastFrame;
    lastFrame = now;
    draw(Math.min(elapsed / 1000, 8));
    if (elapsed < 8000 && visible && !document.hidden && !reducedMotion.matches) {
      frameId = requestAnimationFrame(frame);
    } else {
      lastFrame = 0;
    }
  }

  function resume() {
    if (ready && visible && !document.hidden && !reducedMotion.matches && elapsed < 8000 && !frameId) {
      frameId = requestAnimationFrame(frame);
    }
  }

  logo.onload = () => {
    mask.width = logo.naturalWidth;
    mask.height = logo.naturalHeight;
    maskContext.drawImage(logo, 0, 0);
    maskContext.globalCompositeOperation = 'source-in';
    maskContext.fillStyle = '#edf0ee';
    maskContext.fillRect(0, 0, mask.width, mask.height);
    ready = true;
    stage.classList.add('is-ready');
    resize();
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) resume();
        else stop();
      }, { threshold: .01 });
      observer.observe(hero);
    } else {
      visible = true;
      resume();
    }
  };

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else resume();
  });
  reducedMotion.addEventListener?.('change', () => {
    stop();
    if (reducedMotion.matches) draw(8);
    else {
      elapsed = 0;
      draw(0);
      resume();
    }
  });
  logo.onerror = () => stage.classList.add('is-error');
  logo.src = './assets/lorenzo-rocco-lr-explorer.png';
})();
