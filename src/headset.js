function HeadsetInjection() {
  'use strict';

  class Headset {
    constructor() {
      this.session = null;

      this._keys = {
        moveLeft: 65,     // a
        moveRight: 68,    // d
        moveBackward: 83, // s
        moveForward: 87,  // w
        turnUp: 73,       // i
        turnLeft: 74,     // j
        turnDown: 75,     // k
        turnRight: 76     // l
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

    _updateHeadset() {
      const keys = this._keys;
      const keyPressed = this._keyPressed;
      const position = this._position;
      const rotation = this._rotation;
      const quaternion = this._quaternion;
      const scale = this._scale;
      const matrix = this._matrix;
      const matrixInverse = this._matrixInverse;

      if (keyPressed[keys.moveLeft]) {
        position.x -= 0.02;
      }
      if (keyPressed[keys.moveRight]) {
        position.x += 0.02;
      }
      if (keyPressed[keys.moveForward]) {
        position.z -= 0.02;
      }
      if (keyPressed[keys.moveBackward]) {
        position.z += 0.02;
      }

      if (keyPressed[keys.turnLeft]) {
        rotation.y += 0.02;
      }
      if (keyPressed[keys.turnRight]) {
        rotation.y -= 0.02;
      }
      if (keyPressed[keys.turnUp]) {
        rotation.x += 0.02;
      }
      if (keyPressed[keys.turnDown]) {
        rotation.x -= 0.02;
      }

      quaternion.fromEuler(rotation);

      position.x -= 0.2;

      matrix.compose(position, quaternion, scale);
      matrixInverse.getInverse(matrix);

      if (this.session) {
        matrix.toArray(this.session._frame._viewerPose.views[0].transform.matrix);
        matrixInverse.toArray(this.session._frame._viewerPose.views[0].transform.inverse.matrix);
      }

      position.x += 0.4;

      matrix.compose(position, quaternion, scale);
      matrixInverse.getInverse(matrix);

      if (this.session) {
        matrix.toArray(this.session._frame._viewerPose.views[1].transform.matrix);
        matrixInverse.toArray(this.session._frame._viewerPose.views[1].transform.inverse.matrix);
      }

      position.x -= 0.2;
    }
  }

  console.log(navigator);

  return Headset;
}