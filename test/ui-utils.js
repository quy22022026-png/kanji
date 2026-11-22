/** Shared pure helpers and disposable DOM binding scopes. */
(() => {
  'use strict';
  const escapeHtml = str => String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }
  function createScope() {
    const cleanup = [];
    return Object.freeze({
      listen(target, event, handler) { target?.addEventListener(event, handler); cleanup.push(() => target?.removeEventListener(event, handler)); },
      bind(target, property, handler) { if (!target) return; target[property] = handler; cleanup.push(() => { if (target[property] === handler) target[property] = null; }); },
      add(fn) { cleanup.push(fn); },
      destroy() { for (const fn of cleanup.splice(0).reverse()) fn(); }
    });
  }
  window.KawaiiUiUtils = Object.freeze({escapeHtml, shuffled, createScope});
})();
