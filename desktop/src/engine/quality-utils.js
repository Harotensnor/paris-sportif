function formatAge(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n)) return '-';
  if (n < 1) return '<1 min';
  if (n < 60) return `${Math.round(n)} min`;
  const hours = Math.floor(n / 60);
  const rest = Math.round(n % 60);
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}

function formatCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('fr-FR') : '-';
}

function cleanLabel(value, fallback = 'Signal à surveiller') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function pushAlert(alerts, tone, title, detail, action) {
  alerts.push({
    tone: tone || 'warn',
    title: cleanLabel(title, 'Alerte qualité'),
    detail: cleanLabel(detail, '-'),
    action: cleanLabel(action, 'Vérifier les données avant de miser.')
  });
}

function buildQualityAlerts(status = {}, options = {}) {
  const alerts = [];
  const health = status.health && typeof status.health === 'object' ? status.health : {};
  const sources = options.sources || health.sources || {};
  const checks = options.qualityChecks || health.qualityChecks || {};
  const warnings = Array.isArray(options.warnings)
    ? options.warnings
    : Array.isArray(status.warnings)
      ? status.warnings
      : [];

  if (status.status === 'blocked') {
    pushAlert(alerts, 'danger', 'Données bloquées', `Âge des données : ${formatAge(status.ageMinutes)}.`, 'Lancer Rafraîchir avant toute mise.');
  } else if (status.status === 'stale') {
    pushAlert(alerts, 'warn', 'Données à rafraîchir', `Âge des données : ${formatAge(status.ageMinutes)}.`, 'Rafraîchir avant de suivre les picks.');
  }

  const detailedRatio = Number(checks.winamax_detailed_ratio);
  if (Number.isFinite(detailedRatio) && detailedRatio < 0.85) {
    pushAlert(alerts, 'warn', 'Marchés détaillés faibles', `${(detailedRatio * 100).toFixed(0)}% seulement.`, 'Relancer Rafraîchir pour compléter les cotes.');
  }

  [
    ['clubelo', 'ClubElo', 1440, 'Prévoir un refresh complet ou laisser la prochaine fenêtre longue.'],
    ['xg_team_stats', 'xG équipes', 1440, 'Rafraîchir la source xG quand le réseau est disponible.'],
    ['lineups_soccer', 'Lineups', 180, 'Lancer Signaux lents près du coup d\'envoi.'],
    ['referees_soccer', 'Arbitres', 180, 'Lancer Signaux lents pour réactualiser les profils arbitres.'],
    ['weather', 'Météo', 120, 'Lancer Signaux lents si des matchs foot sont proches.']
  ].forEach(([key, label, limit, action]) => {
    const age = Number(sources[key]?.age_min);
    if (Number.isFinite(age) && age > limit) {
      pushAlert(alerts, age > limit * 2 ? 'danger' : 'warn', `${label} ancien`, `Dernière mise à jour : ${formatAge(age)}.`, action);
    }
  });

  warnings.slice(0, 2).forEach((warning) => {
    pushAlert(alerts, 'warn', 'Warning pipeline', cleanLabel(warning, 'Signal à surveiller'), 'Voir le détail santé ci-dessous.');
  });

  if (!alerts.length && options.includeOk !== false) {
    pushAlert(alerts, 'ok', 'Qualité exploitable', 'Aucun blocage détecté sur les données actionnables.', 'Continuer à utiliser Kelly strict et edge positif.');
  }

  return alerts.slice(0, Number(options.limit ?? 6));
}

module.exports = {
  buildQualityAlerts,
  formatAge,
  formatCount
};
