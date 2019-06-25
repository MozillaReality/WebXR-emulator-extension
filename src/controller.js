function ControllerInjection() {
  'use strict';

  //
  const tmpVector3 = new _Math.Vector3();
  const tmpQuaternion = new _Math.Quaternion();
  const tmpMatrix3 = new _Math.Matrix3();

  const axises = {
    x: new _Math.Vector3(1, 0, 0),
    y: new _Math.Vector3(0, 1, 0),
    z: new _Math.Vector3(0, 0, 1)
  };

  class Controller {
    constructor(device, hasPosition, hasRotation) {
      this.device = device;
      this.hasPosition = hasPosition;
      this.hasRotation = hasRotation;
      this.active = true;

      this._keys = {
        enable: 16,            // shift
        trigger: 32,           // space
        moveLeft: 65,          // a
        moveRight: 68,         // d
        moveUp: 87,            // w
        moveDown: 83,          // s
        moveBackward: 90,      // z
        moveForward: 88,       // x
        turnUp: 73,            // i
        turnLeft: 74,          // j
        turnDown: 75,          // k
        turnRight: 76,         // l
        turnClock: 77,         // m
        turnCounterClock: 188, // comma
        touchLeft: 37,         // left
        touchRight: 39,        // right
        touchUp: 38,           // up
        touchDown: 40          // down
      };

      this._keyPressed = {};

      for (const key in this._keys) {
        this._keyPressed[this._keys[key]] = false;
      }

      this._gamepad = {
        pose: {
          hasPosition: true,
          position: [0, 0, 0],
          orientation: [0, 0, 0, 1]
        },
        buttons: [
          {pressed: false},
          {pressed: false}
        ],
        mapping: 'xr-standard',
        axes: [0, 0]
      };

      this._position = new _Math.Vector3(0.2, 0.9, -0.1);
      this._rotation = new _Math.Euler();
      this._quaternion = new _Math.Quaternion();
      this._scale = new _Math.Vector3(1, 1, 1);
      this._matrix = new _Math.Matrix4();

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
          scope._update();
        }
      }

      animationLoop();
    }

    getGamepad() {
      return this._gamepad;
    }

    _translateOnAxis(axis, distance) {
      tmpVector3.copy(axis).applyMatrix3(tmpMatrix3.setFromMatrix4(this._matrix));
      this._position.x += tmpVector3.x * distance;
      this._position.y += tmpVector3.y * distance;
      this._position.z += tmpVector3.z * distance;
    }

    _update() {
      const session = this.device.session;
      const keys = this._keys;
      const keyPressed = this._keyPressed;
      const gamepad = this._gamepad;
      const position = this._position;
      const rotation = this._rotation;
      const quaternion = this._quaternion;
      const scale = this._scale;
      const matrix = this._matrix;
      const hasPosition = this.hasPosition;
      const hasRotation = this.hasRotation;

      if (keyPressed[keys.trigger] && !gamepad.buttons[1].pressed) {
        gamepad.buttons[1].pressed = true;

        if (session) {
          session._fireSelectStart(this);
        }
      } else if (!keyPressed[keys.trigger] && gamepad.buttons[1].pressed) {
        gamepad.buttons[1].pressed = false;

        if (session) {
          session._fireSelectEnd(this);
        }
      }

      if (keyPressed[keys.enable]) {
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

        gamepad.axes[0] = 0.0;
        gamepad.axes[1] = 0.0;

        if (keyPressed[keys.touchLeft]) {
          gamepad.axes[0] -= 1.0;
        }
        if (keyPressed[keys.touchRight]) {
          gamepad.axes[0] += 1.0;
        }
        if (keyPressed[keys.touchUp]) {
          gamepad.axes[1] -= 1.0;
        }
        if (keyPressed[keys.touchDown]) {
          gamepad.axes[1] += 1.0;
        }

        gamepad.axes[2] = 0.0;
        gamepad.axes[3] = 0.0;

        if (keyPressed[keys.touch2Left]) {
          gamepad.axes[2] -= 1.0;
        }
        if (keyPressed[keys.touch2Right]) {
          gamepad.axes[2] += 1.0;
        }
        if (keyPressed[keys.touch2Up]) {
          gamepad.axes[3] -= 1.0;
        }
        if (keyPressed[keys.touch2Down]) {
          gamepad.axes[3] += 1.0;
        }
      }

      matrix.compose(position, quaternion, scale);

      position.toArray(gamepad.pose.position);
      quaternion.toArray(gamepad.pose.orientation);

      if (session) {
        matrix.toArray(session._frame._pose.transform.matrix);
      }
    }
  }

  return Controller;
}
