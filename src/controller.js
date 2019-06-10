function ControllerInjection() {
  'use strict';

  //

  class Controller {
    constructor() {
      this.session = null;

      this._keys = {
        trigger: 32,   // space
        turnLeft: 37,  // left
        turnUp: 38,    // up
        turnRight: 39, // right
        turnDown: 40   // down
      };

      this._keyPressed = {};

      for (const key in this._keys) {
        this._keyPressed[this._keys[key]] = false;
      }

      this._gamepad = {
        id: 'Oculus Go Controller',
        pose: {
          hasPosition: true,
          position: [0, 0, 0],
          orientation: [0, 0, 0, 1]
        },
        buttons: [
          {pressed: false},
          {pressed: false}
        ]
      };

      this._position = new _Math.Vector3(0.5, 0.9, -0.1);
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
        requestAnimationFrame(animationLoop);
        scope._update();
      }

      animationLoop();
    }

    getGamepad() {
      return this._gamepad;
    }

    setSession(session) {
      this.session = session;
    }

    _update() {
      const keys = this._keys;
      const keyPressed = this._keyPressed;
      const gamepad = this._gamepad;
      const position = this._position;
      const rotation = this._rotation;
      const quaternion = this._quaternion;
      const scale = this._scale;
      const matrix = this._matrix;

      if (keyPressed[keys.trigger] && !gamepad.buttons[1].pressed) {
        gamepad.buttons[1].pressed = true;

        if (this.session) {
          this.session._fireSelectStart(this);
        }
      } else if (!keyPressed[keys.trigger] && gamepad.buttons[1].pressed) {
        gamepad.buttons[1].pressed = false;

        if (this.session) {
          this.session._fireSelectEnd(this);
        }
      }

      if(keyPressed[keys.turnLeft]) {
        rotation.y += 0.02;
      }
      if(keyPressed[keys.turnRight]) {
        rotation.y -= 0.02;
      }
      if(keyPressed[keys.turnUp]) {
        rotation.x += 0.02;
      }
      if(keyPressed[keys.turnDown]) {
        rotation.x -= 0.02;
      }

      quaternion.fromEuler(rotation);

      matrix.compose(position, quaternion, scale);

      position.toArray(gamepad.pose.position);
      quaternion.toArray(gamepad.pose.orientation);

      if (this.session) {
        matrix.toArray(this.session._frame._pose.transform.matrix);
      }
    }
  }

  console.log(navigator);

  return Controller;
}
