import XRDevice from 'webxr-polyfill/src/devices/XRDevice';
import XRInputSource from 'webxr-polyfill/src/api/XRInputSource';
import GamepadXRInputSource from 'webxr-polyfill/src/devices/GamepadXRInputSource';
import {
  vec3,
  quat,
  mat4
} from 'gl-matrix';

export default class EmulatedXRDevice extends XRDevice {

  // @TODO: write config parameter comment

  constructor(global, config={}) {
    super(global);
    this.sessions = new Map();

    this.modes = config.modes || ['inline'];

    // headset
    this.position = vec3.create();
    this.quaternion = quat.create();
    this.scale = vec3.fromValues(1, 1, 1);
    this.matrix = mat4.create();
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
  }

  onBaseLayerSet(sessionId, layer) {
    const session = this.sessions.get(sessionId);
    session.baseLayer = layer;
  }

  isSessionSupported(mode) {
    return this.modes.includes(mode);
  }

  isFeatureSupported(featureDescriptor) {
    switch(featureDescriptor) {
      case 'viewer': return true;
      case 'local': return true;
      case 'local-floor': return true;
      case 'bounded': return false;
      case 'unbounded': return false;
      default: return false;
    }
  }

  async requestSession(mode, enabledFeatures) { 
    if(!this.isSessionSupported(mode)) {
      return Promise.reject();
    }
    const session = new Session(mode, enabledFeatures);
    this.sessions.set(session.id, session);
    return Promise.resolve(session.id);
  }

  requestAnimationFrame(callback) {
    this.global.requestAnimationFrame(callback);
  }

  onFrameStart(sessionId) {
    const session = this.sessions.get(sessionId);
    const renderState = session.baseLayer._session.renderState;
    const canvas = session.baseLayer.context.canvas;
    const near = renderState.depthNear;
    const far = renderState.depthFar;
    const width = canvas.width;
    const height = canvas.height;
    const aspect = width / height;

    // @TODO: proper FOV 
    mat4.perspective(this.leftProjectionMatrix, Math.PI / 2, aspect, near, far);
    mat4.perspective(this.rightProjectionMatrix, Math.PI / 2, aspect, near, far);
    mat4.fromRotationTranslationScale(this.matrix, this.quaternion, this.position, this.scale);
    mat4.invert(this.viewMatrix, this.matrix);

    // Move matrices left/right a bit and then calculate left/rightViewMatrix
    // @TODO: proper left/right distance
    mat4.invert(this.leftViewMatrix, translateOnX(mat4.copy(this.leftViewMatrix, this.matrix), -0.2));
    mat4.invert(this.rightViewMatrix, translateOnX(mat4.copy(this.rightViewMatrix, this.matrix), 0.2));

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
    }
  }

  onFrameEnd(sessionId) {
    // Nothing to do?
  }

  async requestFrameOfReferenceTransform(type, options) {
    // Note:
    return mat4.create();
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
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
    // @TODO: In case eye is 'none'.
    if (this.stereoEffectEnabled) {
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
    // @TODO: In case eye is 'none'.
    return eye === 'left' ? this.leftProjectionMatrix : this.rightProjectionMatrix;
  }

  getBasePoseMatrix() {
    return this.matrix;
  }

  getBaseViewMatrix(eye) {
    if (!this.stereoEffectEnabled) { return this.viewMatrix; }
    // @TODO: In case eye is 'none'.
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

  onWindowResize() {
    // @TODO: implement
  }

  // Private device status update methods invoked from event listeners.

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

  // @TODO: Take button index
  _updateInputButtonPressed(pressed, index) {
    if (index >= this.gamepads.length) { return; }
    const gamepad = this.gamepads[index];
    gamepad.buttons[0].pressed = pressed;
  }

  _initializeControllers(config) {
    const hasController = config.controllers !== undefined;
    const controllerNum = hasController ? config.controllers.length : 0;
    this.gamepads.length = 0;
    this.gamepadInputSources.length = 0;
    for (let i = 0; i < controllerNum; i++) {
      const hasPosition = config.controllers[i].hasPosition;
      this.gamepads.push(createGamepad(i === 0 ? 'right' : 'left', hasPosition));
      this.gamepadInputSources.push(new GamepadXRInputSource(this, null));
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
        case 'rightHand':
        case 'leftHand':
          this._updateInputPose(positionArray, quaternionArray,
            objectName === 'rightHand' ? 0 : 1); // @TODO: remove magic number
          break;
      }
    });

    window.addEventListener('webxr-input-button', event => {
      const pressed = event.detail.pressed;
      const objectName = event.detail.objectName;

      switch (objectName) {
        case 'rightHand':
        case 'leftHand':
          this._updateInputButtonPressed(pressed,
            objectName === 'rightHand' ? 0 : 1); // @TODO: remove magic number
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
    this.id = ++SESSION_ID;
    this.baseLayer = null;
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
      {pressed: false},
      {pressed: false}
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
