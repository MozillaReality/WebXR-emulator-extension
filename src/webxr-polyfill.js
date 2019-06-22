function WebXRPolyfillInjection() {
  'use strict';

  // https://www.w3.org/TR/webxr/#xr-interface

  class XR extends EventTarget {
    constructor() {
      super();
      this._device = null;
      this._devices = [];
    }

    supportsSession(mode) {
      return new Promise((resolve, reject) => {
        const scope = this;

        function checkMode() {
          scope.removeEventListener('devicechange', checkMode);

          return scope._device.modes.indexOf(mode) !== -1
            ? resolve()
            : reject(new DOMException('NotSupportedError'));
        }

        this.addEventListener('devicechange', checkMode);

        if (this._device !== null) {
          checkMode();
        }
      });
    }

    requestSession(mode) {
      return Promise.resolve(new XRSession());
    }

    _activateDevice(device) {
      if (this._devices.indexOf(device)) {
        this._devices.push(device);
      }

      if (this._device !== device) {
        this._device = device;
        this.dispatchEvent(new Event('devicechange'));
      }
    }
  }

  // https://www.w3.org/TR/webxr/#xrsession-interface

  class XRSession extends EventTarget {
    constructor() {
      super();
      this.environmentBlendMode = null;
      this.renderState = null;
      this.viewerSpace = null;

      this._frame = new XRFrame(this);

      this.updateRenderState({});

      this.inputSources = [
        new XRInputSource(this, xrDeviceManager.getGamepad())
      ];
    }

    updateRenderState(option) {
      this.renderState = new XRRenderState(option);
    }

    requestReferenceSpace(type) {
      xrDeviceManager.setSession(this);
      return Promise.resolve(new XRReferenceSpace());
    }

    requestAnimationFrame(callback) {
      requestAnimationFrame(() => {
        callback(performance.now(), this._frame);
      });
    }

    getInputSources() {
      return this.inputSources;
    }

    cancelAnimationFrame() {

    }

    end() {
      this.dispatchEvent(new XRSessionEvent('end', this));
      return Promise.resolve();
    }

    _fireSelectStart(controller) {
      this.dispatchEvent(new XRInputSourceEvent('selectstart', this._frame, this.inputSources[0]));
    }

    _fireSelectEnd(controller) {
      this.dispatchEvent(new XRInputSourceEvent('selectend', this._frame, this.inputSources[0]));
    }
  }

  // https://www.w3.org/TR/webxr/#xrrenderstate-interface

  class XRRenderState {
    constructor(option) {
      option = option || {};
      this.depthNear = option.depthNear || 0.1;
      this.depthFar = option.depthFar || 1000.0;
      this.inlineVerticalFieldOfView = option.inlineVerticalFieldOfView || Math.PI * 0.5;
      this.baseLayer = option.baseLayer;
      this.outputContext = option.outputContext;
    }
  }

  // https://www.w3.org/TR/webxr/#xrframe-interface

  class XRFrame {
    constructor(session) {
      this.session = session;
      this._pose = new XRPose();
      this._viewerPose = new XRViewerPose();
    }

    getViewerPose(space) {
      return this._viewerPose;
    }

    getPose(sourceSpace, destinationSpace) {
      return this._pose;
    }
  }

  // https://www.w3.org/TR/webxr/#xrspace-interface

  class XRSpace {

  }

  // https://www.w3.org/TR/webxr/#xrpose-interface

  class XRPose {
    constructor() {
      this.transform = new XRRigidTransform();
      this.emulatedPosition = false;
    }
  }

  // https://www.w3.org/TR/webxr/#xrviewerpose-interface

  class XRViewerPose {
    constructor() {
      this.views = [new XRView(XREye.left), new XRView(XREye.right)];
    }
  }

  // https://www.w3.org/TR/webxr/#xrview-interface

  const XREye = {
    left: 0,
    right: 1
  };

  class XRView {
    constructor(eye) {
      this.eye = eye;
      this.projectionMatrix = new Float32Array(16);
      this.transform = new XRRigidTransform();
    }
  }

  // https://www.w3.org/TR/webxr/#xrrigidtransform-interface

  class XRRigidTransform {
    constructor() {
      this.position = {x: 0, y: 0, z: 0, w: 1};
      this.orientation = {x: 0, y: 0, z: 0, w: 1};

      this.matrix = new Float32Array(16);
      this.matrix[0] = 1;
      this.matrix[5] = 1;
      this.matrix[10] = 1;
      this.matrix[15] = 1;

      this.inverse = {
        matrix: new Float32Array(16)
      };

      this.inverse.matrix[0] = 1;
      this.inverse.matrix[5] = 1;
      this.inverse.matrix[10] = 1;
      this.inverse.matrix[15] = 1;
    }
  }

  // https://www.w3.org/TR/webxr/#xrviewport-interface

  class XRViewport {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.width = 0;
      this.height = 0;
    }
  }

  // https://www.w3.org/TR/webxr/#xrreferencespace-interface

  class XRReferenceSpace {
    getOffsetReferenceSpace(originOffset) {
    }
  }

  // https://www.w3.org/TR/webxr/#xrwebgllayer-interface

  class XRWebGLLayer {
    constructor(session, context, options) {
      this.framebuffer = null;
      this.framebufferWidth = 0;
      this.framebufferHeight = 0;
      this.context = context;

      this._viewports = {};
      this._viewports[XREye.left] = new XRViewport();
      this._viewports[XREye.right] = new XRViewport();
    }

    getViewport(view) {
      return this._viewports[view.eye];
    }

    requestViewportScaling(viewportScaleFactor) {

    }
  }

  // https://www.w3.org/TR/webxr/#xrinputsource-interface

  class XRInputSource {
    constructor(session, gamepad) {
      this._session = session;
      this.handedness = null;
      this.targetRayMode = null;
      this.targetRaySpace = null;
      this.gripSpace = null;
      this.gamepad = gamepad;
    }
  }

  // https://www.w3.org/TR/webxr/#xrsessionevent-interface

  class XRSessionEvent extends Event {
    constructor(type, session) {
      super(type);
      this.session = session;
    }
  }

  // https://www.w3.org/TR/webxr/#xrinputsourceevent-interface

  class XRInputSourceEvent extends Event {
    constructor(type, frame, inputSource, buttonIndex) {
      super(type);
      this.frame = frame;
      this.inputSource = inputSource;
      this.buttonIndex = buttonIndex !== undefined ? buttonIndex : null;
    }
  }

  // https://www.w3.org/TR/webxr/#xrreferencespaceevent-interface

  class XRReferenceSpaceEvent extends Event {
    constructor(type, referenceSpace, transform) {
      super(type);
      this.referenceSpace = referenceSpace;
      this.transform = transform;
    }
  }

  if (navigator.xr === undefined) {
    navigator.xr = new XR();
  }

  if (window.XR === undefined) {
    window.XR = XR;
  }

  if (window.XRSession === undefined) {
    window.XRSession = XRSession;
  }

  if (window.XRWebGLLayer === undefined) {
    window.XRWebGLLayer = XRWebGLLayer;
  }
}
