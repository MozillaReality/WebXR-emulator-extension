function HeadsetInjection() {
  'use strict';

  class Headset {
    constructor() {
      this._session = null;

      this._keyPressed = {
        65: false, // a: left
        68: false, // d: right
        73: false, // i: up rotation
        74: false, // j: left rotation
        75: false, // k: bottom rotation
        76: false, // l: right rotation
        83: false, // s: backward
        87: false  // w: forward
      };

      this._position = {x: 0, y: 1, z: 0};
      this._rotation = {x: 0, y: 0, z: 0};

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
        scope._handleHeadset();
      }

      animationLoop();
    }

    setSession(session) {
      this._session = session;
      this._update();
    }

    _update() {
      if (this._session) {
        for (let i = 0; i < 2; i++) {
          const view = this._session.frame._viewerPose.views[i];
          const projectionMatrix = [
            1.1006344616457973, 0, 0, 0,
            0, 1.4281480067421146, 0, 0,
            0, 0, -1.02020202020202, -1,
            0, 0, -0.20202020202020202, 0
          ];
          projectionMatrix[12] = i === 0 ? -0.2 : 0.2;

          view.projectionMatrix = new Float32Array(projectionMatrix);
          view.transform.inverse.matrix[0] = 1;
          view.transform.inverse.matrix[5] = 1;
          view.transform.inverse.matrix[10] = 1;
          view.transform.inverse.matrix[13] = -1;
          view.transform.inverse.matrix[15] = 1;
        }
      }
    }

    _handleHeadset() {
      const keyPressed = this._keyPressed;
      const position = this._position;
      const rotation = this._rotation;

      if (keyPressed[65]) {
        position.x -= 0.02;
      }
      if (keyPressed[68]) {
        position.x += 0.02;
      }
      if (keyPressed[83]) {
        position.z += 0.02;
      }
      if (keyPressed[87]) {
        position.z -= 0.02;
      }

      if (keyPressed[73]) {
        rotation.x += 0.02;
      }
      if (keyPressed[74]) {
        rotation.y += 0.02;
      }
      if (keyPressed[75]) {
        rotation.x -= 0.02;
      }
      if (keyPressed[76]) {
        rotation.y -= 0.02;
      }

      const quaternion = [0, 0, 0, 1];

      this._fromEuler(rotation, quaternion);

      if (this._session) {
        position.x -= 0.2;

        this._compose(position, quaternion, this._session.frame._viewerPose.views[0].transform.matrix);
        this._getInverse(this._session.frame._viewerPose.views[0].transform.matrix, this._session.frame._viewerPose.views[0].transform.inverse.matrix);

        position.x += 0.4;

        this._compose(position, quaternion, this._session.frame._viewerPose.views[1].transform.matrix);
        this._getInverse(this._session.frame._viewerPose.views[1].transform.matrix, this._session.frame._viewerPose.views[1].transform.inverse.matrix);

        position.x -= 0.2;
      }
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

      te[12] = position.x;
      te[13] = position.y;
      te[14] = position.z;
      te[15] = 1;
    }

    _getInverse(matrix, matrix2) {
      const me = matrix;
      const te = matrix2;

      const n11 = me[0];
      const n21 = me[1];
      const n31 = me[2];
      const n41 = me[3];

      const n12 = me[4];
      const n22 = me[5];
      const n32 = me[6];
      const n42 = me[7];

      const n13 = me[8];
      const n23 = me[9];
      const n33 = me[10];
      const n43 = me[11];

      const n14 = me[12];
      const n24 = me[13];
      const n34 = me[14];
      const n44 = me[15];

      const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
      const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
      const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
      const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

      const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

      if (det === 0) {
        console.warn('.getInverse() can\'t invert matrix, determinant is 0');
        return;
      }

      const detInv = 1 / det;

      te[0] = t11 * detInv;
      te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
      te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
      te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;

      te[4] = t12 * detInv;
      te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
      te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
      te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;

      te[8] = t13 * detInv;
      te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
      te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
      te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;

      te[12] = t14 * detInv;
      te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
      te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
      te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;

      return this;
    }
  }

  console.log(navigator);

  return Headset;
}
