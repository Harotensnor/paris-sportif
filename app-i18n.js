(function(){
  'use strict';

  const LANG_KEY = 'paris_sportif_lang_v1';
  const FALLBACK = {
    fr: {
      'profile.language.title': '🌍 Langue',
      'profile.language.body': 'Choisis la langue de l’interface. FR reste la langue principale du site.',
      'profile.language.fr': 'Français',
      'profile.language.en': 'English',
      'profile.language.saved': 'Langue enregistrée',
    },
    en: {
      'profile.language.title': '🌍 Language',
      'profile.language.body': 'Choose the interface language. French remains the primary language of the site.',
      'profile.language.fr': 'French',
      'profile.language.en': 'English',
      'profile.language.saved': 'Language saved',
    }
  };
  let catalog = FALLBACK;

  function getUserLang() {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === 'fr' || stored === 'en') return stored;
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}') || {};
      if (prefs.lang === 'fr' || prefs.lang === 'en') return prefs.lang;
    } catch(e) {}
    try { return /^en\b/i.test(navigator.language || '') ? 'en' : 'fr'; }
    catch(e) { return 'fr'; }
  }

  function setUserLang(lang) {
    const next = lang === 'en' ? 'en' : 'fr';
    try { localStorage.setItem(LANG_KEY, next); } catch(e) {}
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}') || {};
      prefs.lang = next;
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
    } catch(e) {}
    try { document.documentElement.lang = next; } catch(e) {}
    return next;
  }

  function i18n(key) {
    const lang = getUserLang();
    return (catalog[lang] && catalog[lang][key])
      || (FALLBACK[lang] && FALLBACK[lang][key])
      || (FALLBACK.fr && FALLBACK.fr[key])
      || key;
  }

  function initI18n() {
    setUserLang(getUserLang());
    try {
      fetch('i18n.json', { cache: 'no-store' })
        .then(r => r && r.ok ? r.json() : null)
        .then(j => { if (j && j.fr && j.en) catalog = j; })
        .catch(() => {});
    } catch(e) {}
  }

  window.getUserLang = getUserLang;
  window.setUserLang = setUserLang;
  window.i18n = i18n;
  initI18n();
})();
