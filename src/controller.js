function ControllerInjection() {
  'use strict';

  //

  class Controller {
    constructor() {
      this.session = null;

      this._keyPressed = {
        32: false,  // space
        37: false,  // left
        38: false,  // up
        39: false,  // right
        40: false   // down
      };

      this._gamepad = {
        id: 'Oculus Go Controller',
        pose: {
          hasPosition: true,
          position: [0.5, 0.9, -0.1],
          orientation: [0, 0, 0, 1]
        },
        buttons: [
          {pressed: false},
          {pressed: false}
        ]
      };

      this._gamepadRotation = {x: 0, y: 0, z: 0};

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
        scope._handleGamepad();
      }

      animationLoop();
    }

    getGamepad() {
      return this._gamepad;
    }

    setSession(session) {
      this.session = session;
    }

    _fromEuler(euler, array) {
      const x = euler.x;
      const y = euler.y;
      const z = euler.z;

      const cos = Math.cos;
      const sin = Math.sin;

      const c1 = cos( x / 2 );
      const c2 = cos( y / 2 );
      const c3 = cos( z / 2 );

      const s1 = sin( x / 2 );
      const s2 = sin( y / 2 );
      const s3 = sin( z / 2 );

      array[0] = s1 * c2 * c3 + c1 * s2 * s3;
      array[1] = c1 * s2 * c3 - s1 * c2 * s3;
      array[2] = c1 * c2 * s3 + s1 * s2 * c3;
      array[3] = c1 * c2 * c3 - s1 * s2 * s3;
    }

    _compose(position, quaternion, te) {
      const x = quaternion[0];
      const y = quaternion[1];
      const z = quaternion[2];
      const w = quaternion[3];

      const x2 = x + x;
      const y2 = y + y;
      const z2 = z + z;
      const xx = x * x2;
      const xy = x * y2;
      const xz = x * z2;
      const yy = y * y2;
      const yz = y * z2;
      const zz = z * z2;
      const wx = w * x2;
      const wy = w * y2;
      const wz = w * z2;

      const sx = 1;
      const sy = 1;
      const sz = 1;

      te[0] = (1 - (yy + zz)) * sx;
      te[1] = (xy + wz) * sx;
      te[2] = (xz - wy) * sx;
      te[3] = 0;

      te[4] = (xy - wz) * sy;
      te[5] = (1 - (xx + zz)) * sy;
      te[6] = (yz + wx) * sy;
      te[7] = 0;

      te[8] = (xz + wy) * sz;
      te[9] = (yz - wx) * sz;
      te[10] = (1 - (xx + yy)) * sz;
      te[11] = 0;

      te[12] = position[0];
      te[13] = position[1];
      te[14] = position[2];
      te[15] = 1;
    }

    _handleGamepad() {
      const keyPressed = this._keyPressed;
      const gamepad = this._gamepad;
      const gamepadRotation = this._gamepadRotation;

      if(keyPressed[32]) {
        gamepad.buttons[1].pressed = true;

        if (this.session) {
          this.session._fireSelectStart(this);
        }
      } else {
        gamepad.buttons[1].pressed = false;

        if (this.session) {
          this.session._fireSelectEnd(this);
        }
      }

      if(keyPressed[37]) {
        gamepadRotation.y += 0.02;
      }
      if(keyPressed[38]) {
        gamepadRotation.x += 0.02;
      }
      if(keyPressed[39]) {
        gamepadRotation.y -= 0.02;
      }
      if(keyPressed[40]) {
        gamepadRotation.x -= 0.02;
      }

      this._fromEuler(gamepadRotation, gamepad.pose.orientation);

      if (this.session) {
        this._compose(gamepad.pose.position, gamepad.pose.orientation, this.session.frame._pose.transform.matrix);
      }
    }
  }

  console.log(navigator);

  return Controller;
}
