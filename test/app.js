/** Bootstrap only: the manifest composes modules; the shell owns the UI. */
(() => {
  'use strict';
  let system;
  window.KawaiiReady = (async () => {
    system = window.KawaiiModuleSystem.create(window.KawaiiModuleManifest.create());
    window.KawaiiRuntime = system;
    await system.start();
    await system.get('compatibility').app.Core.Bootstrap.start();
    system.get('cloudSync').init();
    return system;
  })().catch(async error => {
    console.error('[Kawaii JLPT Bootstrap]', error);
    system?.events.emit('app:error',{code:'BOOTSTRAP_FAILED',error});
    await system?.destroy().catch(console.error);
    const message = document.createElement('p');
    message.setAttribute('role','alert');
    message.textContent = 'Không thể khởi tạo ứng dụng: ' + error.message;
    document.body.appendChild(message);
    throw error;
  });
})();
