function ControllerInjection() {
  'use strict';

  class Controller {
    constructor(device, hasPosition, hasRotation, leftRight) {
      this.device = device;
      this.hasPosition = hasPosition;
      this.hasRotation = hasRotation;

      // @TODO: define Controller.LEFT/RIGHT
      this.leftRight = leftRight;

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

      this._position = new _Math.Vector3();
      this._rotation = new _Math.Euler();
      this._quaternion = new _Math.Quaternion();
      this._scale = new _Math.Vector3(1, 1, 1);
      this._matrix = new _Math.Matrix4();

      this.device.addEventListener('sessionupdate', event => {
        this.updatePose(this._position.toArray([]), this._quaternion.toArray([]));
      });
    }

    getGamepad() {
      return this._gamepad;
    }

    updatePose(positionArray, quaternionArray) {
      const position = this._position.fromArray(positionArray);
      const quaternion = this._quaternion.fromArray(quaternionArray);
      const session = this.device.session;
      const keys = this._keys;
      const keyPressed = this._keyPressed;
      const gamepad = this._gamepad;
      const rotation = this._rotation;
      const scale = this._scale;
      const matrix = this._matrix;

      matrix.compose(position, quaternion, scale);

      position.toArray(gamepad.pose.position);
      quaternion.toArray(gamepad.pose.orientation);

      if (session) {
        matrix.toArray(session._frame._poses[this.leftRight].transform.matrix);
      }
    }

    updateButtonPressed(pressed) {
      const session = this.device.session;
      const gamepad = this._gamepad;

      if (pressed && !gamepad.buttons[1].pressed) {
        gamepad.buttons[1].pressed = true;

        if (session) {
          session._fireSelectStart(this, this.leftRight);
        }
      } else if (!pressed && gamepad.buttons[1].pressed) {
        gamepad.buttons[1].pressed = false;

        if (session) {
          session._fireSelectEnd(this, this.leftRight);
        }
      }
    }
  }

  return Controller;
}
