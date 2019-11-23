import XRDevice from 'webxr-polyfill/src/devices/XRDevice';
import XRInputSource from 'webxr-polyfill/src/api/XRInputSource';
import GamepadXRInputSource from 'webxr-polyfill/src/devices/GamepadXRInputSource';
import {
  vec3,
  quat,
  mat4
} from 'gl-matrix';

const DEFAULT_HEIGHT = 1.6; // @TODO: This value should shared with panel.js?

export default class EmulatedXRDevice extends XRDevice {

  // @TODO: write config parameter comment

  constructor(global, config={}) {
    super(global);
    this.sessions = new Map();

    this.modes = config.modes || ['inline'];

    // headset
    this.position = vec3.fromValues(0, DEFAULT_HEIGHT, 0);
    this.quaternion = quat.create();
    this.scale = vec3.fromValues(1, 1, 1);
    this.matrix = mat4.create();
    this.inlineProjectionMatrix = mat4.create();
    this.leftProjectionMatrix = mat4.create();
    this.rightProjectionMatrix = mat4.create();
    this.viewMatrix = mat4.create();
    this.leftViewMatrix = mat4.create();
    this.rightViewMatrix = mat4.create();

    // controllers
    const hasController = config.controllers !== undefined;
    const controllerNum = hasController ? config.controllers.length : 0;
    this.gamepads = [];
    this.gamepadInputSources = [];
    this._initializeControllers(config);

    // other configurations
    this.stereoEffectEnabled = config.stereoEffect !== undefined ? config.stereoEffect : true;

    this._setupEventListeners();

    this.div = document.createElement('div');
    this.div.style.position = 'absolute';
    this.div.style.width = '100%';
    this.div.style.height = '100%';
    this.div.style.top = '0';
    this.div.style.left = '0';
  }

  onBaseLayerSet(sessionId, layer) {
    const session = this.sessions.get(sessionId);
    if (session.immersive) {
      this._removeBaseLayerCanvasFromBodyIfNeeded(sessionId);
    }
    session.baseLayer = layer;
    if (session.immersive) {
      this._appendBaseLayerCanvasToBodyIfNeeded(sessionId);
    }
  }

  isSessionSupported(mode) {
    return this.modes.includes(mode);
  }

  isFeatureSupported(featureDescriptor) {
    switch(featureDescriptor) {
      case 'viewer': return true;
      case 'local': return true;
      case 'local-floor': return true;
      case 'bounded-floor': return false;
      case 'unbounded': return false;
      default: return false;
    }
  }

  async requestSession(mode, enabledFeatures) { 
    if(!this.isSessionSupported(mode)) {
      return Promise.reject();
    }
    const immersive = mode === 'immersive-vr' || mode === 'immersive-ar';
    const session = new Session(mode, enabledFeatures);
    this.sessions.set(session.id, session);
    if (immersive) {
      this.dispatchEvent('@@webxr-polyfill/vr-present-start', session.id);
    }
    return Promise.resolve(session.id);
  }

  requestAnimationFrame(callback) {
    this.global.requestAnimationFrame(callback);
  }

  cancelAnimationFrame(handle) {
    this.global.cancelAnimationFrame(handle);
  }

  onFrameStart(sessionId, renderState) {
    const session = this.sessions.get(sessionId);
    // guaranteed by the caller that session.baseLayer is not null
    const canvas = session.baseLayer.context.canvas;
    const near = renderState.depthNear;
    const far = renderState.depthFar;
    const width = canvas.width;
    const height = canvas.height;

    if (session.immersive) {
      // @TODO: proper FOV
      const aspect = width * (this.stereoEffectEnabled ? 0.5 : 1.0) / height;
      mat4.perspective(this.leftProjectionMatrix, Math.PI / 2, aspect, near, far);
      mat4.perspective(this.rightProjectionMatrix, Math.PI / 2, aspect, near, far);
    } else {
      const aspect = width / height;
      mat4.perspective(this.inlineProjectionMatrix, session.inlineVerticalFieldOfView, aspect, near, far);
    }
    mat4.fromRotationTranslationScale(this.matrix, this.quaternion, this.position, this.scale);
    mat4.invert(this.viewMatrix, this.matrix);

    // Move matrices left/right a bit and then calculate left/rightViewMatrix
    // @TODO: proper left/right distance
    mat4.invert(this.leftViewMatrix, translateOnX(mat4.copy(this.leftViewMatrix, this.matrix), -0.02));
    mat4.invert(this.rightViewMatrix, translateOnX(mat4.copy(this.rightViewMatrix, this.matrix), 0.02));

    // @TODO: Confirm if input events are only for immersive session
    // @TODO: If there are multiple immersive sessions, input events are fired only for the first session.
    //        Fix this issue (if multiple immersive sessions can be created).
    if (session.immersive) {
      for (let i = 0; i < this.gamepads.length; ++i) {
        const gamepad = this.gamepads[i];
        const inputSourceImpl = this.gamepadInputSources[i];
        inputSourceImpl.updateFromGamepad(gamepad);
        if (inputSourceImpl.primaryButtonIndex !== -1) {
          const primaryActionPressed = gamepad.buttons[inputSourceImpl.primaryButtonIndex].pressed;
          if (primaryActionPressed && !inputSourceImpl.primaryActionPressed) {
            this.dispatchEvent('@@webxr-polyfill/input-select-start', { sessionId: session.id, inputSource: inputSourceImpl.inputSource });
          } else if (!primaryActionPressed && inputSourceImpl.primaryActionPressed) {
            this.dispatchEvent('@@webxr-polyfill/input-select-end', { sessionId: session.id, inputSource: inputSourceImpl.inputSource });
          }
          inputSourceImpl.primaryActionPressed = primaryActionPressed; 
        }
        if (inputSourceImpl.primarySqueezeButtonIndex !== -1) {
          const primarySqueezeActionPressed = gamepad.buttons[inputSourceImpl.primarySqueezeButtonIndex].pressed;
          if (primarySqueezeActionPressed && !inputSourceImpl.primarySqueezeActionPressed) {
            this.dispatchEvent('@@webxr-polyfill/input-squeeze-start', { sessionId: session.id, inputSource: inputSourceImpl.inputSource });
          } else if (!primarySqueezeActionPressed && inputSourceImpl.primarySqueezeActionPressed) {
            this.dispatchEvent('@@webxr-polyfill/input-squeeze-end', { sessionId: session.id, inputSource: inputSourceImpl.inputSource });
          }
          inputSourceImpl.primarySqueezeActionPressed = primarySqueezeActionPressed;
        }
      }
    }
  }

  onFrameEnd(sessionId) {
    // Nothing to do?
  }

  async requestFrameOfReferenceTransform(type, options) {
    // @TODO: Add note
    const matrix = mat4.create();
    switch (type) {
      case 'viewer':
      case 'local':
        matrix[13] = -DEFAULT_HEIGHT;
        return matrix;

      case 'local-floor':
        return matrix;

      case 'bounded-floor':
      case 'unbound':
      default:
        // @TODO: Throw an error?
        return matrix;
    }
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session.immersive) {
      this._removeBaseLayerCanvasFromBodyIfNeeded(sessionId);
      this.dispatchEvent('@@webxr-polyfill/vr-present-end', sessionId);
    }
    session.ended = true;
  }

  doesSessionSupportReferenceSpace(sessionId, type) {
    const session = this.sessions.get(sessionId);
    if (session.ended) {
      return false;
    }
    return session.enabledFeatures.has(type);
  }

  getViewport(sessionId, eye, layer, target) {
    const session = this.sessions.get(sessionId);
    const canvas = session.baseLayer.context.canvas;
    const width = canvas.width;
    const height = canvas.height;
    if (eye === 'none') {
      target.x = 0;
      target.width = width;
    } else if (this.stereoEffectEnabled) {
      target.x = eye === 'left' ? 0 : width / 2;
      target.width = width / 2;
    } else {
      target.x = 0;
      target.width = eye === 'left' ? width : 0;
    }
    target.y = 0;
    target.height = height;
    return true;
  }

  getProjectionMatrix(eye) {
    return eye === 'none' ? this.inlineProjectionMatrix :
           eye === 'left' ? this.leftProjectionMatrix : this.rightProjectionMatrix;
  }

  getBasePoseMatrix() {
    return this.matrix;
  }

  getBaseViewMatrix(eye) {
    if (eye === 'none' || !this.stereoEffectEnabled) { return this.viewMatrix; }
    return eye === 'left' ? this.leftViewMatrix : this.rightViewMatrix;
  }

  getInputSources() {
    const inputSources = [];
    for (const inputSourceImpl of this.gamepadInputSources) {
      inputSources.push(inputSourceImpl.inputSource);
    }
    return inputSources;
  }

  getInputPose(inputSource, coordinateSystem, poseType) {
    for (const inputSourceImpl of this.gamepadInputSources) {
      if (inputSourceImpl.inputSource === inputSource) {
        return inputSourceImpl.getXRPose(coordinateSystem, poseType);
      }
    }
    return null;
  }

  onInlineVerticalFieldOfViewSet(sessionId, value) {
    const session = this.sessions.get(sessionId);
    session.inlineVerticalFieldOfView = value;
  }

  onWindowResize() {
    // @TODO: implement
  }

  // Private methods

  // If baseLayer's canvas of immersive session isn't appended to document
  // nothing will be rendered in immersive mode.
  // So append the canvas to the document when entering immersive mode and
  // removing it when exiting.
  // @TODO: Simplify the method names

  _appendBaseLayerCanvasToBodyIfNeeded(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session.baseLayer || !session.immersive) { return; }
    const canvas = session.baseLayer.context.canvas;
    if (canvas.parentElement) { return; }
    // window size for now
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this.div.appendChild(canvas);
    document.body.appendChild(this.div);
  }

  _removeBaseLayerCanvasFromBodyIfNeeded(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session.baseLayer || !session.immersive) { return; }
    const canvas = session.baseLayer.context.canvas;
    // Not equal may mean an application may have moved the canvas
    // somewhere else so we don't touch in that case.
    if (canvas.parentElement !== this.div) { return; }
    document.body.removeChild(this.div);
    this.div.removeChild(canvas);
    // @TODO: Restore canvas width/height
  }

  // Device status update methods invoked from event listeners.

  _updateStereoEffect(enabled) {
    this.stereoEffectEnabled = enabled;
  }

  _updatePose(positionArray, quaternionArray) {
    for (let i = 0; i < 3; i++) {
      this.position[i] = positionArray[i];
    }
    for (let i = 0; i < 4; i++) {
      this.quaternion[i] = quaternionArray[i];
    }
  }

  _updateInputPose(positionArray, quaternionArray, index) {
    if (index >= this.gamepads.length) { return; }
    const gamepad = this.gamepads[index];
    const pose = gamepad.pose;
    for (let i = 0; i < 3; i++) {
      pose.position[i] = positionArray[i];
    }
    for (let i = 0; i < 4; i++) {
      pose.orientation[i] = quaternionArray[i];
    }
  }

  _updateInputButtonPressed(pressed, controllerIndex, buttonIndex) {
    if (controllerIndex >= this.gamepads.length) { return; }
    const gamepad = this.gamepads[controllerIndex];
    if (buttonIndex >= gamepad.buttons.length) { return; }
    gamepad.buttons[buttonIndex].pressed = pressed;
    gamepad.buttons[buttonIndex].value = pressed ? 1.0 : 0.0;
  }

  _initializeControllers(config) {
    const hasController = config.controllers !== undefined;
    const controllerNum = hasController ? config.controllers.length : 0;
    this.gamepads.length = 0;
    this.gamepadInputSources.length = 0;
    for (let i = 0; i < controllerNum; i++) {
      const hasPosition = config.controllers[i].hasPosition;
      this.gamepads.push(createGamepad(i === 0 ? 'right' : 'left', hasPosition));
      this.gamepadInputSources.push(new GamepadXRInputSource(this, null, 0, 1));
    }
  }

  // Set up event listeners. Events are sent from panel via background.

  _setupEventListeners() {
    window.addEventListener('webxr-device', event => {
      // Note: Just in case release primary buttons and wait for two frames to fire selectend event
      //       before initialize controllers.
      // @TODO: Very hacky. We should go with more proper way.
      for (let i = 0; i < this.gamepads.length; ++i) {
        const gamepad = this.gamepads[i];
        const inputSourceImpl = this.gamepadInputSources[i];
        if (inputSourceImpl.primaryButtonIndex !== -1) {
          gamepad.buttons[inputSourceImpl.primaryButtonIndex].pressed = false;
        }
        if (inputSourceImpl.primarySqueezeButtonIndex !== -1) {
          gamepad.buttons[inputSourceImpl.primarySqueezeButtonIndex].pressed = false;
        }
      }

      this.requestAnimationFrame(() => {
        this.requestAnimationFrame(() => {
          this._initializeControllers(event.detail.deviceDefinition);
        });
      });
    });

    window.addEventListener('webxr-pose', event => {
      const positionArray = event.detail.position;
      const quaternionArray = event.detail.quaternion;
      this._updatePose(positionArray, quaternionArray);
    }, false);

    window.addEventListener('webxr-input-pose', event => {
      const positionArray = event.detail.position;
      const quaternionArray = event.detail.quaternion;
      const objectName = event.detail.objectName;

      switch (objectName) {
        case 'rightController':
        case 'leftController':
          this._updateInputPose(positionArray, quaternionArray,
            objectName === 'rightController' ? 0 : 1); // @TODO: remove magic number
          break;
      }
    });

    window.addEventListener('webxr-input-button', event => {
      const pressed = event.detail.pressed;
      const objectName = event.detail.objectName;
      const buttonIndex = event.detail.buttonIndex;

      switch (objectName) {
        case 'rightController':
        case 'leftController':
          this._updateInputButtonPressed(pressed,
            objectName === 'rightController' ? 0 : 1, // @TODO: remove magic number
            buttonIndex);
          break;
      }
    }, false);

    window.addEventListener('webxr-stereo-effect', event => {
      this._updateStereoEffect(event.detail.enabled);
    });
  }
};

let SESSION_ID = 0;
class Session {
  constructor(mode, enabledFeatures) {
    this.mode = mode;
    this.immersive = mode == 'immersive-vr' || mode == 'immersive-ar';
    this.id = ++SESSION_ID;
    this.baseLayer = null;
    this.inlineVerticalFieldOfView = Math.PI * 0.5;
    this.ended = false;
    this.enabledFeatures = enabledFeatures;
  }
}

const createGamepad = (hand, hasPosition) => {
  return {
    pose: {
      hasPosition: hasPosition,
      position: [0, 0, 0],
      orientation: [0, 0, 0, 1]
    },
    buttons: [
      // select
      {
        pressed: false,
        touched: false,
        value: 0.0
      },
      // squeeze
      {
        pressed: false,
        touched: false,
        value: 0.0
      }
    ],
    hand: hand,
    mapping: 'xr-standard',
    axes: [0, 0]
  };
};

// From Three.js Object3D.translateOnAxis
const tmpVec3 = vec3.create();
const tmpQuat = quat.create();
const translateOnX = (matrix, distance) => {
  vec3.set(tmpVec3, 1, 0, 0);
  mat4.getRotation(tmpQuat, matrix);
  vec3.transformQuat(tmpVec3, tmpVec3, tmpQuat);
  vec3.set(tmpVec3, tmpVec3[0] * distance, tmpVec3[1] * distance, tmpVec3[2] * distance);
  return mat4.translate(matrix, matrix, tmpVec3);
};
