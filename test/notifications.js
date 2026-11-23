/** Feature API; injected dependencies only. Legacy rendering retained. */
(() => {
  'use strict';
  function create(options = {}) {
    const $ = options.getElement || (id => document.getElementById(id));
    const timers = new Set();
    const setTimeout = (fn, ms) => { const id = window.setTimeout(() => {timers.delete(id); fn();}, ms); timers.add(id); return id; };
    let confirmCleanup = null;
    function showToast(message, type = 'info') {
      const colors = {
        info: 'bg-[#332E2E] text-white',
        success: 'bg-matcha-600 text-white',
        error: 'bg-[#E11D48] text-white'
      };
      const el = document.createElement('div');
      el.className = `${colors[type] || colors.info} px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg animate-pop max-w-[90vw] text-center`;
      el.textContent = message;
      const container = $('toastContainer');
      if (container.children.length >= 3) container.firstElementChild.remove();
      container.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.25s';
        setTimeout(() => el.remove(), 260);
      }, 2500);
    }

    function showConfirm(title, message) {
      if (confirmCleanup) confirmCleanup(false);
      return new Promise(resolve => {
        $('confirmTitle').textContent = title;
        $('confirmMessage').textContent = message;
        $('confirmModal').classList.remove('hidden');
        const finish = (ok) => {
          $('confirmModal').classList.add('hidden');
          $('confirmOkBtn').onclick = null;
          $('confirmCancelBtn').onclick = null;
          confirmCleanup = null;
          resolve(ok);
        };
        confirmCleanup = finish;
        $('confirmOkBtn').onclick = () => finish(true);
        $('confirmCancelBtn').onclick = () => finish(false);
      });
    }


    return Object.freeze({showToast, showConfirm, destroy() { confirmCleanup?.(false); timers.forEach(window.clearTimeout); timers.clear(); $('toastContainer')?.replaceChildren(); }});
  }
  window.KawaiiNotificationsModule = Object.freeze({create});
})();
