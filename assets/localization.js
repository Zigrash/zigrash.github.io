(() => {
  const languages = ['en', 'it', 'ja'];
  const names = { en: 'English', it: 'Italiano', ja: '日本語' };
  const accessibilityLabels = {
    en: 'Select language',
    it: 'Seleziona la lingua',
    ja: '言語を選択'
  };
  const normalize = value => value.replace(/\s+/g, ' ').trim();

  function setupLocalization() {
    const homeNav = document.getElementById('nav');
    const detailBar = document.querySelector('.topbar');
    const data = homeNav ? window.PORTFOLIO_LOCALES_HOME : window.PORTFOLIO_LOCALES_PROJECTS;
    if (!data || (!homeNav && !detailBar)) return;

    let savedLanguage;
    try { savedLanguage = window.localStorage.getItem('lorenzo-portfolio-language'); } catch (_) {}
    const queryLanguage = new URL(window.location.href).searchParams.get('lang');
    let language = languages.includes(queryLanguage) ? queryLanguage
      : languages.includes(savedLanguage) ? savedLanguage : 'en';
    window.portfolioTranslate = source => data[language]?.text?.[normalize(source)] ?? source;

    const picker = document.createElement('div');
    picker.className = 'locale-picker';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'locale-trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    const options = document.createElement('div');
    options.className = 'locale-options';
    options.setAttribute('role', 'group');
    const optionButtons = new Map();
    languages.forEach(code => {
      const option = document.createElement('button');
      option.type = 'button';
      option.dataset.language = code;
      option.textContent = names[code];
      options.append(option);
      optionButtons.set(code, option);
    });
    picker.append(trigger, options);
    if (homeNav) {
      homeNav.append(picker);
    } else {
      const brand = detailBar.querySelector('.brand');
      const group = document.createElement('div');
      group.className = 'topbar-locale';
      group.append(picker);
      if (brand) group.append(brand);
      detailBar.append(group);
    }

    const htmlSelectors = new Set([
      ...Object.keys(data.it?.html || {}),
      ...Object.keys(data.ja?.html || {})
    ]);
    const htmlTargets = [];
    htmlSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        htmlTargets.push({ element, selector, original: element.innerHTML });
      });
    });
    const isInsideHtmlTarget = node => htmlTargets.some(({ element }) => element.contains(node));
    const textNodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!normalize(node.nodeValue || '')) continue;
      if (node.parentElement?.closest('script,style,noscript,svg,.locale-picker')) continue;
      if (isInsideHtmlTarget(node)) continue;
      textNodes.push({ node, original: node.nodeValue });
    }
    const attributes = [];
    document.querySelectorAll('[alt],[title],[aria-label],[placeholder],[data-label]').forEach(element => {
      if (element.closest('.locale-picker') || isInsideHtmlTarget(element)) return;
      ['alt', 'title', 'aria-label', 'placeholder', 'data-label'].forEach(name => {
        if (element.hasAttribute(name)) attributes.push({ element, name, original: element.getAttribute(name) });
      });
    });
    const originalTitle = document.title;
    const translate = (original, dictionary) => {
      const translated = dictionary[normalize(original)];
      if (translated === undefined) return original;
      const leading = original.match(/^\s*/)[0];
      const trailing = original.match(/\s*$/)[0];
      return leading + translated + trailing;
    };
    const close = () => {
      picker.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    };
    const apply = (code, updateUrl) => {
      language = code;
      const translation = data[code] || {};
      const dictionary = translation.text || {};
      htmlTargets.forEach(({ element, selector, original }) => {
        element.innerHTML = code === 'en' ? original : (translation.html?.[selector] ?? original);
      });
      textNodes.forEach(({ node, original }) => {
        node.nodeValue = code === 'en' ? original : translate(original, dictionary);
      });
      attributes.forEach(({ element, name, original }) => {
        element.setAttribute(name, code === 'en' ? original : translate(original, dictionary));
      });
      const navButton = document.getElementById('navBtn');
      if (navButton) {
        const label = navButton.getAttribute('aria-expanded') === 'true' ? 'Close menu' : 'Open menu';
        navButton.setAttribute('aria-label', code === 'en' ? label : (dictionary[label] ?? label));
      }
      const trailButton = document.getElementById('trail-toggle');
      if (trailButton) {
        const label = trailButton.getAttribute('aria-pressed') === 'false'
          ? 'Trail + drawing: Off' : 'Trail + drawing: On';
        trailButton.textContent = code === 'en' ? label : (dictionary[label] ?? label);
      }
      document.title = code === 'en' ? originalTitle : translate(originalTitle, dictionary);
      document.documentElement.lang = code;
      document.documentElement.dataset.locale = code;
      trigger.textContent = code.toUpperCase();
      trigger.setAttribute('aria-label', accessibilityLabels[code]);
      options.setAttribute('aria-label', accessibilityLabels[code]);
      optionButtons.forEach((button, optionCode) => {
        button.setAttribute('aria-pressed', String(optionCode === code));
      });
      try { window.localStorage.setItem('lorenzo-portfolio-language', code); } catch (_) {}
      if (updateUrl) {
        const nextUrl = new URL(window.location.href);
        if (code === 'en') nextUrl.searchParams.delete('lang');
        else nextUrl.searchParams.set('lang', code);
        try { window.history.replaceState(window.history.state, '', nextUrl.href); } catch (_) {}
      }
    };

    trigger.addEventListener('click', () => {
      const open = !picker.classList.contains('open');
      picker.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', String(open));
    });
    optionButtons.forEach((button, code) => button.addEventListener('click', () => {
      apply(code, true);
      close();
      trigger.focus();
    }));
    document.addEventListener('pointerdown', event => {
      if (!picker.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
    apply(language, !queryLanguage && language !== 'en');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLocalization, { once: true });
  } else setupLocalization();
})();
