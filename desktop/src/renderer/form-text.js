(function () {
  'use strict';

  function normalizeLetters(letters) {
    return (Array.isArray(letters) ? letters : [])
      .map((letter) => String(letter || '').trim().toUpperCase())
      .filter((letter) => ['W', 'D', 'L'].includes(letter));
  }

  function countWord(count, singular, plural) {
    return `${count} ${count > 1 ? plural : singular}`;
  }

  function summaryFromLetters(letters, { compact = false } = {}) {
    const list = normalizeLetters(letters);
    if (!list.length) return 'forme non confirmée';
    const counts = {
      W: list.filter((letter) => letter === 'W').length,
      D: list.filter((letter) => letter === 'D').length,
      L: list.filter((letter) => letter === 'L').length
    };
    const parts = [];
    if (counts.W) parts.push(countWord(counts.W, 'victoire', 'victoires'));
    if (counts.D) parts.push(countWord(counts.D, 'nul', 'nuls'));
    if (counts.L) parts.push(countWord(counts.L, 'défaite', 'défaites'));
    return parts.join(compact ? ' · ' : ', ') || 'forme non confirmée';
  }

  function summaryFromCodeSequence(value) {
    const raw = String(value || '').trim().toUpperCase().replace(/[^WVNDL]/g, '').slice(0, 10);
    if (!raw) return '';
    const frenchMode = /[VP]/.test(raw) || (/[N]/.test(raw) && !/[WL]/.test(raw));
    const mapped = raw.split('').map((letter) => {
      if (letter === 'W' || letter === 'V') return 'W';
      if (letter === 'L') return 'L';
      if (letter === 'N') return 'D';
      if (letter === 'D') return frenchMode || !/[WL]/.test(raw) ? 'L' : 'D';
      return '';
    }).filter(Boolean);
    return summaryFromLetters(mapped);
  }

  function prettify(value) {
    let text = String(value || '');
    text = text.replace(/\bforme\s+([WVNDL]{3,10})\s*\/\s*([WVNDL]{3,10})\b/gi, (_match, home, away) => {
      const homeText = summaryFromCodeSequence(home);
      const awayText = summaryFromCodeSequence(away);
      return `forme : domicile ${homeText} · extérieur ${awayText}`;
    });
    text = text.replace(/\b([WVNDL]{3,10})\b/g, (match) => summaryFromCodeSequence(match) || match);
    return text;
  }

  window.PSFormText = Object.freeze({
    summaryFromLetters,
    summaryFromCodeSequence,
    prettify
  });
}());
