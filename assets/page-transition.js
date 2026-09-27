(() => {
  const root = document.documentElement;
  const currentUrl = new URL(window.location.href);
  const params = currentUrl.searchParams;
  const direction = params.get('transition');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nativeTransition = !reducedMotion && /^https?:$/.test(window.location.protocol)
    && 'CSSViewTransitionRule' in window;
  if (nativeTransition) root.classList.add('native-page-transition');
  const returnY = params.has('returnY') ? Number(params.get('returnY')) : NaN;
  const returnAnchor = params.get('returnAnchor');
  const returnTop = params.has('returnTop') ? Number(params.get('returnTop')) : NaN;
  const resumeY = params.has('resumeY') ? Number(params.get('resumeY')) : NaN;
  const resumeAnchor = params.get('resumeAnchor');
  const resumeTop = params.has('resumeTop') ? Number(params.get('resumeTop')) : NaN;
  const hasReturnPosition = Number.isFinite(returnY) && returnY >= 0;
  const hasResumePosition = Number.isFinite(resumeY) && resumeY >= 0;

  if (hasResumePosition) {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    let restoreActive = true;
    const restorePosition = () => {
      if (!restoreActive) return;
      const anchor = resumeAnchor && Number.isFinite(resumeTop)
        ? document.getElementById(resumeAnchor)
        : null;
      const targetY = anchor
        ? window.scrollY + anchor.getBoundingClientRect().top - resumeTop
        : resumeY;
      const previousBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, Math.max(0, Math.round(targetY)));
      root.style.scrollBehavior = previousBehavior;
    };
    document.addEventListener('DOMContentLoaded', () => {
      restorePosition();
      requestAnimationFrame(restorePosition);
    }, { once: true });
    window.addEventListener('load', restorePosition, { once: true });
    window.addEventListener('pageshow', restorePosition, { once: true });
    if (document.fonts) document.fonts.ready.then(restorePosition);
    window.setTimeout(() => {
      restorePosition();
      restoreActive = false;
      if (previousRestoration === 'auto' || previousRestoration === 'manual') {
        window.history.scrollRestoration = previousRestoration;
      }
    }, 1200);
  }

  if (direction === 'project' || direction === 'home') {
    if (nativeTransition) root.classList.add(`page-enter-${direction}`);
  }
  if (nativeTransition && (direction === 'project' || direction === 'home')) {
    const clearDirection = () => root.classList.remove('page-enter-project', 'page-enter-home');
    window.addEventListener('pagereveal', event => {
      if (event.viewTransition) event.viewTransition.finished.finally(clearDirection);
    }, { once: true });
    window.setTimeout(clearDirection, 1600);
  }
  if (direction === 'project' || direction === 'home' || direction === 'settled') {
    try {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(window.history.state, '', cleanUrl);
    } catch (_) {
      // The transition still works if this browser cannot rewrite local file URLs.
    }
  }

  let navigationPending = false;
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const projectLink = target && target.closest('a[href*="/project-details/"]');
    const homeLink = target && target.closest('a.back');
    const direction = projectLink ? 'project' : homeLink ? 'home' : null;
    if (!direction) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (navigationPending) { event.preventDefault(); return; }
    const link = projectLink || homeLink;
    const nextUrl = new URL(link.href, window.location.href);
    nextUrl.searchParams.set('transition', direction);
    if (projectLink && document.getElementById('professional')) {
      const markerY = Math.min(window.innerHeight / 3, 240);
      const anchors = document.querySelectorAll('section[id], .project[id]');
      let anchor = null;
      for (const candidate of anchors) {
        if (candidate.getBoundingClientRect().top <= markerY) anchor = candidate;
      }
      nextUrl.searchParams.set('returnY', String(Math.round(window.scrollY)));
      if (anchor) {
        nextUrl.searchParams.set('returnAnchor', anchor.id);
        nextUrl.searchParams.set('returnTop', String(Math.round(anchor.getBoundingClientRect().top)));
      }
    } else if (projectLink && hasReturnPosition) {
      nextUrl.searchParams.set('returnY', String(returnY));
      if (returnAnchor && Number.isFinite(returnTop)) {
        nextUrl.searchParams.set('returnAnchor', returnAnchor);
        nextUrl.searchParams.set('returnTop', String(returnTop));
      }
    }
    if (homeLink && hasReturnPosition) {
      nextUrl.hash = '';
      nextUrl.searchParams.set('resumeY', String(returnY));
      if (returnAnchor && Number.isFinite(returnTop)) {
        nextUrl.searchParams.set('resumeAnchor', returnAnchor);
        nextUrl.searchParams.set('resumeTop', String(returnTop));
      }
    }
    event.preventDefault();
    navigationPending = true;
    if (nativeTransition) {
      window.location.assign(nextUrl.href);
      return;
    }

    const settledUrl = new URL(nextUrl.href);
    settledUrl.searchParams.set('transition', 'settled');
    if (reducedMotion) {
      window.location.assign(settledUrl.href);
      return;
    }

    const previewUrl = new URL(nextUrl.href);
    previewUrl.searchParams.set('transition', 'preview');
    const shell = document.createElement('div');
    shell.className = `page-preview-shell page-preview-shell-${direction}`;
    const preview = document.createElement('iframe');
    preview.className = 'page-preview';
    preview.setAttribute('aria-hidden', 'true');
    preview.tabIndex = -1;
    preview.title = 'Next page';
    shell.append(preview);
    const edge = document.createElement('div');
    edge.className = `page-preview-edge page-preview-edge-${direction}`;
    edge.setAttribute('aria-hidden', 'true');
    let navigated = false;
    let revealing = false;
    const navigate = () => {
      if (navigated) return;
      navigated = true;
      edge.remove();
      window.location.assign(settledUrl.href);
    };
    preview.addEventListener('load', () => {
      if (navigated) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        revealing = true;
        shell.classList.add('is-revealing');
        edge.classList.add('is-revealing');
        window.setTimeout(navigate, 950);
      }));
    }, { once: true });
    shell.addEventListener('animationend', navigate, { once: true });
    preview.src = previewUrl.href;
    document.body.append(shell, edge);
    window.setTimeout(() => { if (!revealing) navigate(); }, 5000);
  });
})();
