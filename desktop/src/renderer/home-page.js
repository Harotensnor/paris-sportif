(function () {
  'use strict';

  const CATEGORY_META = {
    cockpit: {
      kicker: 'Cockpit 24h',
      title: 'Tous les paris triables',
      subtitle: 'Vue complète pour filtrer, comparer et ouvrir les sections détaillées.'
    },
    winner: {
      kicker: 'Vainqueurs',
      title: 'Les paris Vainqueur en priorité',
      subtitle: 'Focus sur les matchs à résultat simple, avec filet 2-0 Winamax quand il est disponible.'
    },
    goals: {
      kicker: 'Buts',
      title: 'Plus / Moins et les deux marquent',
      subtitle: 'Tous les paris buts sont regroupés ici pour ne pas charger l’accueil principal.'
    },
    night: {
      kicker: 'Nuit',
      title: 'Les prochaines nuits à surveiller',
      subtitle: 'Sports US, Asie et matchs tardifs sur la semaine : prêt si dossier solide, sinon prochain re-check.'
    },
    week: {
      kicker: 'Semaine',
      title: 'Les prochains spots à suivre',
      subtitle: 'Le meilleur spot peut être demain ou plus tard : la page évite de forcer un mauvais pari aujourd’hui.'
    },
    'sport:football': {
      kicker: 'Football',
      title: 'Football : priorité aux paris simples',
      subtitle: 'Vainqueurs, buts simples et buteurs vérifiés, avec prudence si compos/blessures manquent.'
    },
    'sport:tennis': {
      kicker: 'Tennis',
      title: 'Les matchs tennis à lire vite',
      subtitle: 'Vainqueurs tennis en priorité ; les totaux jeux restent à surveiller.'
    },
    'sport:basketball': {
      kicker: 'Basket',
      title: 'Les spots basket des prochaines 24h',
      subtitle: 'Moneyline et favoris propres, surtout nuit NBA/WNBA.'
    },
    'sport:baseball': {
      kicker: 'Baseball',
      title: 'Les spots baseball de nuit',
      subtitle: 'Moneyline prudente ; les pitchers incertains restent sans mise.'
    },
    'sport:hockey': {
      kicker: 'Hockey',
      title: 'Les spots hockey',
      subtitle: 'Vainqueurs simples, prudence si goalie inconnu.'
    },
    strict: {
      kicker: 'Mode strict',
      title: 'Les paris les plus propres',
      subtitle: 'Seulement les lignes avec contexte correct, badge fiable et mise autorisée.'
    },
    value: {
      kicker: 'Gros gain',
      title: 'Gros gain propre',
      subtitle: 'Cotes 2+ avec avantage positif ou pari prêt, pour chercher du rendement sans ouvrir les marchés dangereux.'
    },
    watch: {
      kicker: 'À surveiller',
      title: 'Signaux utiles, sans mise directe',
      subtitle: 'Ces lignes attendent un re-check, une cote ou un contexte plus propre avant d’être jouées.'
    }
  };

  const DEFAULT_META = {
    kicker: 'Top 3 prochaines 24h',
    title: 'À regarder maintenant',
    subtitle: 'Bouton vert = jouable. Sinon on surveille, sans forcer.'
  };

  const TAB_TO_CATEGORY = {
    cockpit: 'cockpit',
    winners: 'winner',
    goals: 'goals',
    night: 'night',
    football: 'sport:football',
    tennis: 'sport:tennis',
    basket: 'sport:basketball',
    baseball: 'sport:baseball',
    hockey: 'sport:hockey',
    week: 'week',
    watch: 'watch',
    strict: 'strict',
    value: 'value'
  };

  const CATEGORY_TO_TAB = {
    cockpit: 'cockpit',
    ready: 'dashboard',
    winner: 'winners',
    goals: 'goals',
    scorer: 'scorers',
    night: 'night',
    watch: 'watch',
    today: 'dashboard',
    tomorrow: 'week',
    week: 'week',
    combines: 'combines',
    'sport:football': 'football',
    'sport:tennis': 'tennis',
    'sport:basketball': 'basket',
    'sport:baseball': 'baseball',
    'sport:hockey': 'hockey',
    strict: 'strict',
    value: 'value'
  };

  function metaFor(category) {
    return CATEGORY_META[category] || DEFAULT_META;
  }

  function categoryTabToKey(tab) {
    return TAB_TO_CATEGORY[tab] || tab || 'cockpit';
  }

  function tabForHomeCategory(category) {
    const key = String(category || '').toLowerCase();
    return CATEGORY_TO_TAB[key] || (key.startsWith('sport:') ? 'football' : 'cockpit');
  }

  function categoryDecisionText(category, stats = {}) {
    const key = String(category || '').toLowerCase();
    const total = Number(stats.total || 0);
    const ready = Number(stats.ready || 0);
    const watch = Number(stats.watch || 0);
    if (!total) {
      if (key === 'night') return 'Aucun spot nuit propre dans la semaine : inutile de forcer.';
      if (key === 'week') return 'Aucun spot sérieux trouvé cette semaine dans le cache actuel.';
      return 'Aucun spot propre dans cette catégorie pour le moment.';
    }
    if (ready > 0) {
      if (key === 'watch') return 'Cette page reste volontairement sans mise directe : surveille les re-checks.';
      if (key === 'night') return `${ready} pari${ready > 1 ? 's' : ''} de nuit jouable${ready > 1 ? 's' : ''}. Joue simple, pas en rattrapage.`;
      return `${ready} pari${ready > 1 ? 's' : ''} jouable${ready > 1 ? 's' : ''}. Commence par le meilleur spot, pas par tout jouer.`;
    }
    if (watch > 0) {
      if (key === 'night') return `${watch} spot${watch > 1 ? 's' : ''} de nuit à surveiller. Pas de mise tant que les absences/stars ne sont pas propres.`;
      return `${watch} spot${watch > 1 ? 's' : ''} à surveiller. Pas de bouton tant que le dossier n’est pas assez propre.`;
    }
    return 'Des lignes existent, mais les garde-fous refusent la mise.';
  }

  window.PSHomePage = Object.freeze({
    metaFor,
    categoryTabToKey,
    tabForHomeCategory,
    categoryDecisionText,
    categoryMeta: CATEGORY_META,
    defaultMeta: DEFAULT_META
  });
}());
