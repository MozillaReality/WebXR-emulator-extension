function HeadsetInjection() {
  'use strict';

  const tmpVector3 = new _Math.Vector3();
  const tmpQuaternion = new _Math.Quaternion();
  const tmpMatrix3 = new _Math.Matrix3();

  const projectionMatrix = new _Math.Matrix4();

  const axises = {
    x: new _Math.Vector3(1, 0, 0),
    y: new _Math.Vector3(0, 1, 0),
    z: new _Math.Vector3(0, 0, 1)
  };

  class Headset {
    constructor(device, hasPosition, hasRotation) {
      this.device = device;
      this.hasPosition = hasPosition;
      this.hasRotation = hasRotation;
      this.stereoEnabled = true;
      this.active = true;

      this._keys = {
        disable: 16,          // shift
        moveLeft: 65,         // a
        moveRight: 68,        // d
        moveUp: 87,           // w
        moveDown: 83,         // s
        moveBackward: 90,     // z
        moveForward: 88,      // x
        turnUp: 73,           // i
        turnLeft: 74,         // j
        turnDown: 75,         // k
        turnRight: 76,        // l
        turnClock: 77,        // m
        turnCounterClock: 188 // comma
      };

      this._keyPressed = {};

      for (const key in this._keys) {
        this._keyPressed[this._keys[key]] = false;
      }

      this._position = new _Math.Vector3(0, 1, 0);
      this._rotation = new _Math.Euler();
      this._quaternion = new _Math.Quaternion();
      this._scale = new _Math.Vector3(1, 1, 1);
      this._matrix = new _Math.Matrix4();
      this._matrixInverse = new _Math.Matrix4();

      this.device.addEventListener('sessionupdate', event => {
        this._updateViewport();
        this._updateProjectionMatrices();
      });

      this._updateViewport();
      this._updateProjectionMatrices();

      window.addEventListener('keydown', event => {
        if (this._keyPressed[event.keyCode] !== undefined) {
          this._keyPressed[event.keyCode] = true;
        }
      }, false);

      window.addEventListener('keyup', event => {
        if (this._keyPressed[event.keyCode] !== undefined) {
          this._keyPressed[event.keyCode] = false;
        }
      }, false);

      const scope = this;

      function animationLoop() {
        if (scope.active) {
          requestAnimationFrame(animationLoop);
          scope._updateHeadset();
        }
      }

      animationLoop();
    }

    _updateProjectionMatrices() {
      const session = this.device.session;

      if (!session || !session.renderState) {
        return;
      }

      const renderState = session.renderState;
      const depthNear = renderState.depthNear;
      const depthFar = renderState.depthFar;
      const inlineVerticalFieldOfView = renderState.inlineVerticalFieldOfView;
      const aspect = window.innerWidth / window.innerHeight * (this.stereoEnabled ? 0.5 : 1.0);

      for (let i = 0; i < 2; i++) {
        const view = session._frame._viewerPose.views[i];
        const fov = inlineVerticalFieldOfView * 180 / Math.PI
        this._updateProjectionMatrix(fov, aspect, depthNear, depthFar, view.projectionMatrix);
      }
    }

    enableStereo(enable) {
      this.stereoEnabled = enable;
    }

    _updateViewport() {
      const session = this.device.session;

      if (!session ||
          !session.renderState ||
          !session.renderState.baseLayer ||
          !session.renderState.baseLayer._viewports) {
        return;
      }

      const viewports = session.renderState.baseLayer._viewports;
      for (let i = 0; i < 2; i++) {
        // @TODO: Use XREye.left/right?
        const viewport = viewports[i];

        if (this.stereoEnabled) {
          viewport.x = i === 0 ? 0 : window.innerWidth / 2 * window.devicePixelRatio;
          viewport.width = window.innerWidth / 2 * window.devicePixelRatio;
        } else {
          viewport.x = i === 0 ? 0 : window.innerWidth * window.devicePixelRatio;
          viewport.width = i === 0 ? window.innerWidth * window.devicePixelRatio : 0;
        }

        viewport.y = 0;
        viewport.height = window.innerHeight * window.devicePixelRatio;
      }
    }

    _updateProjectionMatrix(fov, aspect, near, far, array) {
      const zoom = 1;
      const top = near * Math.tan(Math.PI / 180 * 0.5 * fov) / zoom;
      const height = 2 * top;
      const width = aspect * height;
      const left = -0.5 * width;

      projectionMatrix.makePerspective(left, left + width, top, top - height, near, far);
      projectionMatrix.toArray(array);
    }

    _translateOnAxis(axis, distance) {
      tmpVector3.copy(axis).applyMatrix3(tmpMatrix3.setFromMatrix4(this._matrix));
      this._position.x += tmpVector3.x * distance;
      this._position.y += tmpVector3.y * distance;
      this._position.z += tmpVector3.z * distance;
    }

    _updateHeadset() {
      const session = this.device.session;
      const keys = this._keys;
      const keyPressed = this._keyPressed;
      const position = this._position;
      const rotation = this._rotation;
      const quaternion = this._quaternion;
      const scale = this._scale;
      const matrix = this._matrix;
      const matrixInverse = this._matrixInverse;
      const hasPosition = this.hasPosition;
      const hasRotation = this.hasRotation;

      if (!keyPressed[keys.disable]) {
        if (hasPosition) {
          if (keyPressed[keys.moveLeft]) {
            this._translateOnAxis(axises.x, -0.02);
          }
          if (keyPressed[keys.moveRight]) {
            this._translateOnAxis(axises.x, 0.02);
          }
          if (keyPressed[keys.moveUp]) {
            this._translateOnAxis(axises.y, 0.02);
          }
          if (keyPressed[keys.moveDown]) {
            this._translateOnAxis(axises.y, -0.02);
          }
          if (keyPressed[keys.moveForward]) {
            this._translateOnAxis(axises.z, 0.02);
          }
          if (keyPressed[keys.moveBackward]) {
            this._translateOnAxis(axises.z, -0.02);
          }
        }

        if (hasRotation) {
          if (keyPressed[keys.turnLeft]) {
            quaternion.multiply(tmpQuaternion.setFromAxisAngle(axises.y, 0.02));
          }
          if (keyPressed[keys.turnRight]) {
            quaternion.multiply(tmpQuaternion.setFromAxisAngle(axises.y, -0.02));
          }
          if (keyPressed[keys.turnUp]) {
            quaternion.multiply(tmpQuaternion.setFromAxisAngle(axises.x, 0.02));
          }
          if (keyPressed[keys.turnDown]) {
            quaternion.multiply(tmpQuaternion.setFromAxisAngle(axises.x, -0.02));
          }
          if (keyPressed[keys.turnClock]) {
            quaternion.multiply(tmpQuaternion.setFromAxisAngle(axises.z, 0.02));
          }
          if (keyPressed[keys.turnCounterClock]) {
            quaternion.multiply(tmpQuaternion.setFromAxisAngle(axises.z, -0.02));
          }
        }
      }

      if (session) {
        // for left eye

        if (this.stereoEnabled) {
          this._translateOnAxis(axises.x, -0.02);
        }

        matrix.compose(position, quaternion, scale);
        matrixInverse.getInverse(matrix);

        matrix.toArray(session._frame._viewerPose.views[0].transform.matrix);
        matrixInverse.toArray(session._frame._viewerPose.views[0].transform.inverse.matrix);

        // for right eye

        if (this.stereoEnabled) {
          this._translateOnAxis(axises.x, 0.04);
        }

        matrix.compose(position, quaternion, scale);
        matrixInverse.getInverse(matrix);

        matrix.toArray(session._frame._viewerPose.views[1].transform.matrix);
        matrixInverse.toArray(session._frame._viewerPose.views[1].transform.inverse.matrix);

        // reset position

        if (this.stereoEnabled) {
          this._translateOnAxis(axises.x, -0.02);
        }
      }

      matrix.compose(position, quaternion, scale);
      matrixInverse.getInverse(matrix);
    }
  }

  return Headset;
}
