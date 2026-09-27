(() => {
  const root = document.documentElement;
  const direction = new URL(window.location.href).searchParams.get('transition');
  if (direction === 'project' || direction === 'home') {
    root.classList.add(`page-enter-${direction}`);
    try {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(window.history.state, '', cleanUrl);
    } catch (_) {
      // The transition still works if this browser cannot rewrite local file URLs.
    }
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const projectLink = target && target.closest('a[href*="/project-details/"]');
    const homeLink = target && target.closest('a.back');
    const direction = projectLink ? 'project' : homeLink ? 'home' : null;
    if (!direction) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = projectLink || homeLink;
    const nextUrl = new URL(link.href, window.location.href);
    nextUrl.searchParams.set('transition', direction);
    event.preventDefault();
    window.location.assign(nextUrl.href);
  });

  document.addEventListener('animationend', event => {
    if (event.target.classList.contains('page-transition') && event.animationName.startsWith('page-wipe-')) {
      root.classList.remove('page-enter-project', 'page-enter-home');
    }
  });
})();
