function injectedScript() {

  'use strict';

  //

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

  class XR {
    supportsSession(mode) {
      return Promise.resolve();
    }

    requestSession(mode) {
      return Promise.resolve(new XRSession());
    }
  }

  class XRSession extends EventDispatcher {
    constructor() {
      super();
      this.frame = new XRFrame();
      this.renderState = {};
      this.inputSources = [];
    }

    updateRenderState(state) {
      this.renderState = state;
    }

    requestReferenceSpace(type) {
      return Promise.resolve(new XRReferenceSpace());
    }

    requestAnimationFrame(func) {
      requestAnimationFrame(() => {
        func(performance.now(), this.frame);
      });
    }

    end() {
      this.dispatchEvent('end', {});
    }
  }

  class XRFrame {
    getViewerPose(space) {
      return new XRViewerPose();
    }
  }

  class XRViewerPose {
    constructor() {
      this.views = [new XRView(0), new XRView(1)];
    }
  }

  class XRView {
    constructor(eye) {
      this.eye = eye;

      const projectionMatrix = [
        1.1006344616457973, 0, 0, 0,
        0, 1.4281480067421146, 0, 0,
        0, 0, -1.02020202020202, -1,
        0, 0, -0.20202020202020202, 0
      ];
      projectionMatrix[12] = eye === 0 ? -0.2 : 0.2;

      this.projectionMatrix = new Float32Array(projectionMatrix);
      this.transform = new XRRigidTransform();
      this.transform.inverse.matrix[0] = 1;
      this.transform.inverse.matrix[5] = 1;
      this.transform.inverse.matrix[10] = 1;
      this.transform.inverse.matrix[13] = -1;
      this.transform.inverse.matrix[15] = 1;
    }
  }

  class XRRigidTransform {
    constructor() {
      this.position;
      this.orientation;
      this.matrix = new Float32Array(16);
      this.inverse = {
        matrix: new Float32Array(16)
      };
    }
  }

  class XRReferenceSpace {

  }

  class XRWebGLLayer {
    constructor(session, gl) {
      this.framebuffer = null;
    }

    getViewport(view) {
      return {
        x: view.eye === 0 ? 0 : window.innerWidth / 2 * window.devicePixelRatio,
        y: 0,
        width: window.innerWidth / 2 * window.devicePixelRatio,
        height: window.innerHeight * window.devicePixelRatio
      };
    }
  }

  if (navigator.xr === undefined) {
    navigator.xr = new XR();
  }

  if (window.XRWebGLLayer === undefined) {
    window.XRWebGLLayer = XRWebGLLayer;
  }

  console.log(navigator);
}
