// In this file prefix '_' means that that property/method
// is not defined under WebXR device API rather than it's private.

// @TODO: Full WebXR API support.
// @TODO: Bump into the latest spec. Currently based on 21 May 2019 draft version.

function WebXRPolyfillInjection() {

  // https://www.w3.org/TR/webxr/#xr-interface

  class XR extends EventTarget {
    constructor() {
      super();
      this._device = null;
      this._devices = [];
    }

    supportsSession(mode) {
      console.warn('navigator.xr.supportsSession() has been deprecated. Use navigator.xr.isSessionSupported() instead.');
      return new Promise((resolve, reject) => {
        this.isSessionSupported(mode).then(supported => {
          if (supported) {
            resolve();
          } else {
            reject(new DOMException('NotSupportedError'));
          }
        });
      });
    }

    isSessionSupported(mode) {
      return new Promise((resolve, reject) => {
        const checkMode = () => {
          this.removeEventListener('devicechange', checkMode);
          return resolve(this._device.modes.indexOf(mode) !== -1);
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
      this.renderState = new XRRenderState();
      this.viewerSpace = null;
      this._ended = false;

      this.inputSources = [];
      const gamepads = xrDeviceManager.getGamepads();
      for (let i = 0, il = gamepads.length; i < il; i++) {
        this.inputSources[i] = new XRInputSource(this, gamepads[i], i === 0 ? 'right' : 'left');
      }

      this._frame = new XRFrame(this);
    }

    updateRenderState(option) {
      if (this._ended) {
        throw new DOMException('InvalidStateError');
      }

      this.renderState._update(option);
      xrDeviceManager.setSession(this);
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
      this._ended = true;
      this.dispatchEvent(new XRSessionEvent('end', this));
      return Promise.resolve();
    }

    // @TODO: better to replace the following _notify* methods
    //        with event handlers?

    _notifyViewerPoseUpdated(matrixArray, matrixInverseArray, positions, orientations) {
      this._frame._updateViewerPose(matrixArray, matrixInverseArray, positions, orientations);
    }

    _notifyProjectionMatricesUpdated(projectionMatrixArray) {
      this._frame._updateProjectionMatrices(projectionMatrixArray);
    }

    _notifyViewportsUpdated(viewportArray) {
      this.renderState._updateViewports(viewportArray);
    }

    _notifyControllerPoseUpdated(index, matrixArray, positionArray, orientationArray) {
      this._frame._updatePose(index, matrixArray, positionArray, orientationArray);
    }

    _notifyControllerButtonPressed(index) {
      this.dispatchEvent(new XRInputSourceEvent('selectstart', this._frame, this.inputSources[index]));
      this.dispatchEvent(new XRInputSourceEvent('select', this._frame, this.inputSources[index]));
    }

    _notifyControllerButtonReleased(index) {
      this.dispatchEvent(new XRInputSourceEvent('selectend', this._frame, this.inputSources[index]));
    }
  }

  // https://www.w3.org/TR/webxr/#xrrenderstate-interface

  class XRRenderState {
    constructor(option) {
      option = option || {};
      this.depthNear = 0.1;
      this.depthFar = 1000.0;
      this.inlineVerticalFieldOfView = Math.PI * 0.5;
      this.baseLayer = null;
      this.outputContext = null;
    }

    _update(option) {
      if (option.depthNear !== undefined) {
        this.depthNear = option.depthNear;
      }

      if (option.depthFar !== undefined) {
        this.depthFar = option.depthFar;
      }

      if (option.inlineVerticalFieldOfView !== undefined) {
        this.inlineVerticalFieldOfView = option.inlineVerticalFieldOfView;
      }

      if (option.baseLayer !== undefined) {
        this.baseLayer = option.baseLayer;
      }

      if (option.outputContext !== undefined) {
        this.outputContext = option.outputContext;
      }
    }

    _updateViewports(viewportArray) {
      if (!this.baseLayer) {
        return;
      }

      const viewports = this.baseLayer._viewports;
      for (let i = 0; i < viewports.length; i++) {
        const viewport = viewports[i];
        viewport.x = viewportArray[i * 4 + 0];
        viewport.y = viewportArray[i * 4 + 1];
        viewport.width = viewportArray[i * 4 + 2];
        viewport.height = viewportArray[i * 4 + 3];
      }
    }
  }

  // https://www.w3.org/TR/webxr/#xrframe-interface

  class XRFrame {
    constructor(session) {
      this.session = session;
      this._poses = [];
      const inputSources = session.inputSources;
      for (let i = 0, il = inputSources.length; i < il; i++) {
        this._poses[i] = new XRPose();
      }
      this._viewerPose = new XRViewerPose();
    }

    getViewerPose(space) {
      if (this.session._ended) {
        return null;
      }

      return this._viewerPose;
    }

    getPose(sourceSpace, destinationSpace) {
      const inputSources = this.session.inputSources;
      for (let i = 0, il = inputSources.length; i < il; i++) {
        if (inputSources[i].targetRaySpace === sourceSpace) {
          return this._poses[i];
        }
      }
      return null;
    }

    _updateViewerPose(matrixArray, matrixInverseArray, positionArray, orientationArray) {
      for (let i = 0; i < 2; i++) {
        const view = this._viewerPose.views[i];
        const matrix = view.transform.matrix;
        const matrixInverse = view.transform.inverse.matrix;
        const position = view.transform.position;
        const orientation = view.transform.orientation;
        for (let j = 0; j < 16; j++) {
          matrix[j] = matrixArray[i * 16 + j];
          matrixInverse[j] = matrixInverseArray[i * 16 + j];
          position.x = positionArray[i * 3 + 0];
          position.y = positionArray[i * 3 + 1];
          position.z = positionArray[i * 3 + 2];
          orientation.x = orientationArray[i * 4 + 0];
          orientation.y = orientationArray[i * 4 + 1];
          orientation.z = orientationArray[i * 4 + 2];
          orientation.w = orientationArray[i * 4 + 3];
        }
      }
    }

    _updateProjectionMatrices(projectionMatrixArray) {
      const views = this._viewerPose.views;
      for (let i = 0; i < views.length; i++) {
        const projectionMatrix = views[i].projectionMatrix;
        for (let j = 0; j < 16; j++) {
          projectionMatrix[j] = projectionMatrixArray[i * 16 + j];
        }
      }
    }

    _updatePose(index, matrixArray, positionArray, orientationArray) {
      const pose = this._poses[index];
      const matrix = pose.transform.matrix;
      const position = pose.transform.position;
      const orientation = pose.transform.orientation;
      for (let i = 0; i < 16; i++) {
        matrix[i] = matrixArray[i];
      }
      position.x = positionArray[0];
      position.y = positionArray[1];
      position.z = positionArray[2];
      orientation.x = orientationArray[0];
      orientation.y = orientationArray[1];
      orientation.z = orientationArray[2];
      orientation.w = orientationArray[3];
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

  class XRViewerPose extends XRPose {
    constructor() {
      super();
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
    constructor(position, orientation) {
      this.position = {x: 0, y: 0, z: 0, w: 1};
      this.orientation = {x: 0, y: 0, z: 0, w: 1};

      if (position !== undefined) {
        this.position.x = position.x;
        this.position.y = position.y;
        this.position.z = position.z;
      }

      if (orientation !== undefined) {
        this.orientation.x = orientation.x;
        this.orientation.y = orientation.y;
        this.orientation.z = orientation.z;
        this.orientation.w = orientation.w;
      }

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
      return new XRReferenceSpace();
    }
  }

  // https://www.w3.org/TR/webxr/#xrwebgllayer-interface

  class XRWebGLLayer {
    constructor(session, context, options) {
      this.framebuffer = null;
      this.context = context;

      this._viewports = [];
      this._viewports[XREye.left] = new XRViewport();
      this._viewports[XREye.right] = new XRViewport();
    }

    getViewport(view) {
      return this._viewports[view.eye];
    }

    requestViewportScaling(viewportScaleFactor) {

    }

    get framebufferWidth() {
      return this.context.drawingBufferWidth;
    }

    get framebufferHeight() {
      return this.context.drawingBufferHeight;
    }
  }

  // https://www.w3.org/TR/webxr/#xrinputsource-interface

  class XRInputSource {
    constructor(session, gamepad, handedness) {
      this._session = session;
      this.handedness = handedness;
      this.targetRayMode = null;
      this.targetRaySpace = new XRSpace();
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

  navigator.xr = new XR();

  // In Chrome(76) window.XR* are overriden by browser
  // after the timing of "run_at": "document_start" of content_scripts.
  // Then defining window.XR* here with defineProperties + writable: false
  // to avoid the overriding.
  // @TODO: investigate how to have XR device emulators interact with
  //        WebXR API defined by browser.

  Object.defineProperties(window, {
    XR: {
      value: XR,
      writable: false
    },
    XRSession: {
      value: XRSession,
      writable: false
    },
    XRWebGLLayer: {
      value: XRWebGLLayer,
      writable: false
    },
    XRRigidTransform: {
      value: XRRigidTransform,
      writable: false
    }
  });
}
