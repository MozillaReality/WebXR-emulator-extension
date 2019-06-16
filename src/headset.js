function HeadsetInjection() {
  'use strict';

  const tmpVector3 = new _Math.Vector3();
  const tmpQuaternion = new _Math.Quaternion();
  const tmpMatrix3 = new _Math.Matrix3();
  const deviceTypes = Configuration.deviceTypes();

  const capabilities = {};
  capabilities[deviceTypes.None] = {position: false, rotation: false};
  capabilities[deviceTypes.OculusGo] = {position: false, rotation: true};
  capabilities[deviceTypes.OculusQuest] = {position: true, rotation: true};

  const axises = {
    x: new _Math.Vector3(1, 0, 0),
    y: new _Math.Vector3(0, 1, 0),
    z: new _Math.Vector3(0, 0, 1)
  };

  class Headset {
    constructor() {
      this.session = null;
      this._deviceType = deviceTypes.None;

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
        requestAnimationFrame(animationLoop);
        scope._updateHeadset();
      }

      animationLoop();
    }

    setSession(session) {
      this.session = session;

      for (let i = 0; i < 2; i++) {
        const view = this.session._frame._viewerPose.views[i];

        const projectionMatrix = view.projectionMatrix;
        projectionMatrix[0] = 1.1006344616457973;
        projectionMatrix[1] = 0;
        projectionMatrix[2] = 0;
        projectionMatrix[3] = 0;

        projectionMatrix[4] = 0;
        projectionMatrix[5] = 1.4281480067421146;
        projectionMatrix[6] = 0;
        projectionMatrix[7] = 0;

        projectionMatrix[8] = 0;
        projectionMatrix[9] = 0;
        projectionMatrix[10] = -1.02020202020202;
        projectionMatrix[11] = -1;

        projectionMatrix[12] = i === 0 ? -0.2 : 0.2;
        projectionMatrix[13] = 0;
        projectionMatrix[14] = -0.20202020202020202;
        projectionMatrix[15] = 0;
      }
    }

    setDeviceType(type) {
      this._deviceType = type;
    }

    _translateOnAxis(axis, distance) {
      tmpVector3.copy(axis).applyMatrix3(tmpMatrix3.setFromMatrix4(this._matrix));
      this._position.x += tmpVector3.x * distance;
      this._position.y += tmpVector3.y * distance;
      this._position.z += tmpVector3.z * distance;
    }

    _updateHeadset() {
      const keys = this._keys;
      const keyPressed = this._keyPressed;
      const position = this._position;
      const rotation = this._rotation;
      const quaternion = this._quaternion;
      const scale = this._scale;
      const matrix = this._matrix;
      const matrixInverse = this._matrixInverse;
      const capability = capabilities[this._deviceType];

      if (!keyPressed[keys.disable]) {
        if (capability.position) {
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

        if (capability.rotation) {
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
            quaternion.multiply(tmpQuaternion.setFromAxisAngle(axises.z, -0.02));
          }
          if (keyPressed[keys.turnCounterClock]) {
            quaternion.multiply(tmpQuaternion.setFromAxisAngle(axises.z, 0.02));
          }
        }
      }

      if (this.session) {
        // for left eye

        this._translateOnAxis(axises.x, -0.2);

        matrix.compose(position, quaternion, scale);
        matrixInverse.getInverse(matrix);

        matrix.toArray(this.session._frame._viewerPose.views[0].transform.matrix);
        matrixInverse.toArray(this.session._frame._viewerPose.views[0].transform.inverse.matrix);

        // for right eye

        this._translateOnAxis(axises.x, 0.4);

        matrix.compose(position, quaternion, scale);
        matrixInverse.getInverse(matrix);

        matrix.toArray(this.session._frame._viewerPose.views[1].transform.matrix);
        matrixInverse.toArray(this.session._frame._viewerPose.views[1].transform.inverse.matrix);

        // reset position

        this._translateOnAxis(axises.x, -0.2);
      }

      matrix.compose(position, quaternion, scale);
      matrixInverse.getInverse(matrix);
    }
  }

  return Headset;
}
