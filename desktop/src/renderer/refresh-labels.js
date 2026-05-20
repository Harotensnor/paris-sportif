(function () {
  'use strict';

  const ESTIMATE_SECONDS = Object.freeze({
    instant: 12,
    fast: 35,
    quick: 240,
    signals: 520,
    full: 1200,
    prematch: 420,
    prematch_t60: 280,
    prematch_t30: 260,
    prematch_t10: 210,
    critical: 260,
    repair_context: 340
  });

  const MODE_LABELS = Object.freeze({
    instant: 'Recalcul instant',
    fast: 'Synchro rapide',
    signals: 'Réparer signaux',
    quick: 'Maintenance enrichie',
    full: 'Maintenance complète',
    prematch: 'Pré-match final',
    prematch_t60: 'Pré-match T-60',
    prematch_t30: 'Pré-match T-30',
    prematch_t10: 'Pré-match T-10',
    critical: 'File critique',
    repair_context: 'Réparer contexte'
  });

  const SOURCE_LABELS = Object.freeze({
    all: 'Tous signaux',
    weather: 'Météo',
    referees: 'Arbitres',
    referees_soccer: 'Arbitres foot',
    injuries: 'Blessures',
    injuries_soccer: 'Blessures foot',
    injuries_multisport: 'Blessures multi-sport',
    lineups: 'Lineups',
    lineups_soccer: 'Compos foot',
    lineups_multisport: 'Compos multi-sport',
    team_form: 'Forme équipes',
    form_stats_extended: 'Forme étendue',
    team_stats: 'Stats équipes',
    clubelo: 'Force équipe/Elo',
    h2h: 'H2H',
    h2h_extended: 'Historique H2H',
    context: 'Contexte match',
    match_context: 'Contexte match',
    odds: 'Cotes',
    xg_team_stats: 'xG équipes',
    fbref_xg: 'xG football',
    scorer_quality: 'Buteurs'
  });

  function modeLabel(mode) {
    return MODE_LABELS[mode] || MODE_LABELS.instant;
  }

  function sourceLabel(source) {
    return SOURCE_LABELS[source] || SOURCE_LABELS.all;
  }

  window.PSRefreshLabels = Object.freeze({
    estimateSeconds: ESTIMATE_SECONDS,
    modeLabel,
    sourceLabel
  });
}());
