const QA_ERROR_KEY = 'paris_sportif_js_errors_v1';
const QA_ERROR_LIMIT = 100;
const QA_SEED_KEY = 'paris_sportif_qa_seed';

function qaRuntimeNote(error) {
  window.__qaRuntimeLastError = String((error && error.message) || error || 'qa-runtime-error').slice(0, 240);
}

function qaReadErrors() {
  try {
    const raw = JSON.parse(localStorage.getItem(QA_ERROR_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (error) {
    qaRuntimeNote(error);
    return [];
  }
}

function qaSaveErrors(errors) {
  try {
    localStorage.setItem(QA_ERROR_KEY, JSON.stringify(errors.slice(-QA_ERROR_LIMIT)));
  } catch (error) {
    qaRuntimeNote(error);
  }
}

function qaRecordError(type, message, stack) {
  const entry = {
    t: Date.now(),
    type: String(type || 'error').slice(0, 40),
    msg: String(message || 'unknown').slice(0, 400),
    stack: String(stack || '').slice(0, 1200),
    page: (window.location && window.location.hash) || '#dashboard',
    url: (window.location && window.location.href) || '',
  };
  const errors = qaReadErrors();
  const duplicate = errors.slice(-4).some(item =>
    item && item.type === entry.type && item.msg === entry.msg && Math.abs(entry.t - Number(item.t || 0)) < 1500
  );
  if (!duplicate) qaSaveErrors([...errors, entry]);
  return entry;
}

function qaBugReport() {
  return {
    exported_at: new Date().toISOString(),
    source: 'qa-runtime-local',
    version: 1,
    context: {
      url: window.location ? window.location.href : '',
      user_agent: navigator.userAgent || '',
      data_generated_at: window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.generated_at || null,
      cache_version: window.CACHE_VERSION || null,
    },
    errors: qaReadErrors().slice(-QA_ERROR_LIMIT).reverse(),
  };
}

function qaExportBugReport() {
  const payload = qaBugReport();
  try {
    if (typeof Blob === 'undefined' || !document || !document.body) return payload;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `paris-sportif-bug-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  } catch (error) {
    qaRecordError('qa_export_failed', (error && error.message) || error, error && error.stack);
  }
  return payload;
}

function qaHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function qaSeed() {
  try {
    const existing = localStorage.getItem(QA_SEED_KEY);
    if (existing) return existing;
    const seed = `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(QA_SEED_KEY, seed);
    return seed;
  } catch (error) {
    qaRuntimeNote(error);
    return 'qa-runtime-fallback-seed';
  }
}

function qaCanaryVariant(name = 'default') {
  const key = `paris_sportif_canary_${String(name || 'default')}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    const variant = qaHash(`${qaSeed()}:${name}`) % 2 === 0 ? 'control' : 'variant';
    localStorage.setItem(key, variant);
    return variant;
  } catch (error) {
    qaRuntimeNote(error);
    return qaHash(String(name || 'default')) % 2 === 0 ? 'control' : 'variant';
  }
}

window.__errors = () => qaReadErrors().slice().reverse();
window.__bugReport = qaBugReport;
window.__qaBugReport = qaBugReport;
window.__exportBugReport = qaExportBugReport;
window.__qaExportBugReport = qaExportBugReport;
window.__qaCanaryVariant = qaCanaryVariant;
window.__qaRuntimeInstalled = true;

window.addEventListener('error', (event) => {
  if (event.target && event.target !== window && !event.error) return;
  qaRecordError(
    'error',
    event.message || (event.error && event.error.message) || 'unknown',
    (event.error && event.error.stack) || `${event.filename || ''}:${event.lineno || ''}`
  );
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  qaRecordError(
    'promise',
    (reason && (reason.message || reason.toString())) || 'unhandled rejection',
    (reason && reason.stack) || ''
  );
});
