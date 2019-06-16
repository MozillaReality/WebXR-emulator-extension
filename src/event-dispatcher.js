function EventDispatcherInjection() {
  'use strict';

  class EventDispatcher {
    constructor() {
      this.listeners = {};
    }

    addEventListener(key, func) {
      if (this.listeners[key] === undefined) {
        this.listeners[key] = [];
      }

      if (this.listeners[key].indexOf(func) >= 0) {
        return;
      }

      this.listeners[key].push(func);
    }

    removeEventListener(key, func) {
      if (this.listeners[key] === undefined) {
        return;
      }

      if (this.listeners[key].indexOf(func) === -1) {
        return;
      }

      this.listeners[key] = this.listeners[key].splice(this.listeners[key].indexOf(func), 1);
    }

    dispatchEvent(key, value) {
      if (this.listeners[key] === undefined) {
        return;
      }

      const listeners = this.listeners[key].slice();
      for (let i = 0, il = listeners.length; i < il; i++) {
        listeners[i](value);
      }
    }
  }

  return EventDispatcher;
}
