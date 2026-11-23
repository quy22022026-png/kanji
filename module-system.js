/** Explicit classic-script dependency graph and scoped event lifecycle. No loader. */
(() => {
  'use strict';
  function createEventBus(onError = error => console.error('[Kawaii Event]', error)) {
    const listeners = new Map();
    function on(name, handler) {
      if (typeof handler !== 'function') throw new TypeError('Event handler must be a function.');
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(handler);
      return () => { listeners.get(name)?.delete(handler); };
    }
    const bus = Object.freeze({
      on,
      off: (name, handler) => listeners.get(name)?.delete(handler),
      once(name, handler) { const off = on(name, payload => { off(); return handler(payload); }); return off; },
      emit(name, payload) {
        for (const handler of [...(listeners.get(name) || [])]) {
          try { const result = handler(payload); if (result?.catch) result.catch(onError); }
          catch (error) { onError(error); }
        }
      },
      clear: () => listeners.clear()
    });
    return bus;
  }
  function resolve(manifest) {
    const definitions = new Map();
    for (const entry of manifest) {
      if (!entry.id || typeof entry.create !== 'function') throw new TypeError('Module requires id and create.');
      if (definitions.has(entry.id)) throw new Error(`Duplicate module: ${entry.id}`);
      definitions.set(entry.id, entry);
    }
    const order = [], marks = new Map();
    function visit(id, path = []) {
      if (!definitions.has(id)) throw new Error(`Missing dependency: ${[...path, id].join(' -> ')}`);
      if (marks.get(id) === 1) throw new Error(`Dependency cycle: ${[...path, id].join(' -> ')}`);
      if (marks.get(id) === 2) return;
      marks.set(id, 1);
      for (const dependency of definitions.get(id).dependencies || []) visit(dependency, [...path, id]);
      marks.set(id, 2); order.push(definitions.get(id));
    }
    for (const id of definitions.keys()) visit(id);
    return order;
  }
  function create(manifest, options = {}) {
    const order = resolve(manifest), instances = new Map(), cleanups = new Map();
    const events = options.events || createEventBus(options.onError);
    let operation = null;
    async function destroy() {
      const errors = [];
      for (const entry of [...order].reverse()) {
        if (!instances.has(entry.id) && !cleanups.has(entry.id)) continue;
        try { await instances.get(entry.id)?.destroy?.(); } catch (error) { errors.push(error); }
        for (const cleanup of (cleanups.get(entry.id) || []).reverse()) {
          try { await cleanup(); } catch (error) { errors.push(error); }
        }
        instances.delete(entry.id); cleanups.delete(entry.id);
      }
      operation = null;
      if (errors.length) throw new AggregateError(errors, 'Module teardown failed.');
    }
    async function initialize() {
      try {
        for (const entry of order) {
          const cleanup = []; cleanups.set(entry.id, cleanup);
          const dependencies = Object.freeze(Object.fromEntries((entry.dependencies || []).map(id => [id, instances.get(id)])));
          const scopedEvents = Object.freeze({
            ...events,
            on: (name, fn) => { const off = events.on(name, fn); cleanup.push(off); return off; },
            once: (name, fn) => { const off = events.once(name, fn); cleanup.push(off); return off; }
          });
          const api = await entry.create({ dependencies, events: scopedEvents, cleanup: fn => cleanup.push(fn) });
          if (!api) throw new Error(`Module ${entry.id} returned no API.`);
          instances.set(entry.id, api);
          await api.init?.();
        }
        return system;
      } catch (error) {
        try { await destroy(); } catch (teardown) { error.teardown = teardown; }
        throw error;
      }
    }
    const system = Object.freeze({
      start() { if (!operation) operation = initialize(); return operation; },
      get(id) { if (!instances.has(id)) throw new Error(`Module not initialized: ${id}`); return instances.get(id); },
      describe: () => order.map(({id, dependencies = []}) => ({id, dependencies: [...dependencies]})),
      events, destroy
    });
    return system;
  }
  window.KawaiiModuleSystem = Object.freeze({ create, createEventBus, resolve });
})();
