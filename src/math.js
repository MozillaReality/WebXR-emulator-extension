function MathInjection() {
  'use strict';

  class Vector3 {
    constructor(x, y, z) {
      this.x = x || 0;
      this.y = y || 0;
      this.z = z || 0;
    }

    toArray(array) {
      array[0] = this.x;
      array[1] = this.y;
      array[2] = this.z;

      return this;
    }

    normalize() {
      return this.divideScalar(this.length() || 1);
    }

    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    multiplyScalar(scalar) {
      this.x *= scalar;
      this.y *= scalar;
      this.z *= scalar;
      return this;
    }

    divideScalar(scalar) {
      return this.multiplyScalar(1 / scalar);
    }
  }

  class Euler {
    constructor(x, y, z) {
      this.x = x || 0;
      this.y = y || 0;
      this.z = z || 0;
    }
  }

  class Quaternion {
    constructor(x, y, z, w) {
      this.x = x || 0;
      this.y = y || 0;
      this.z = z || 0;
      this.w = w || 1;
    }

    fromEuler(euler) {
      const x = euler.x;
      const y = euler.y;
      const z = euler.z;

      const cos = Math.cos;
      const sin = Math.sin;

      const c1 = cos(x / 2);
      const c2 = cos(y / 2);
      const c3 = cos(z / 2);

      const s1 = sin(x / 2);
      const s2 = sin(y / 2);
      const s3 = sin(z / 2);

      this.x = s1 * c2 * c3 + c1 * s2 * s3;
      this.y = c1 * s2 * c3 - s1 * c2 * s3;
      this.z = c1 * c2 * s3 + s1 * s2 * c3;
      this.w = c1 * c2 * c3 - s1 * s2 * s3;

      return this;
    }

    toArray(array) {
      array[0] = this.x;
      array[1] = this.y;
      array[2] = this.z;
      array[3] = this.w;

      return this;
    }
  }

  class Matrix4 {
    constructor() {
      this.elements = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ]);
    }

    toArray(array) {
      for (let i = 0; i < 16; i++) {
        array[i] = this.elements[i];
      }

      return this;
    }

    compose(position, quaternion, scale) {
      const te = this.elements;

      const x = quaternion.x;
      const y = quaternion.y;
      const z = quaternion.z;
      const w = quaternion.w;

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

      const sx = scale.x;
      const sy = scale.y;
      const sz = scale.z;

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

      return this;
    }

    getInverse(matrix) {
      const me = matrix.elements;
      const te = this.elements;

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

    getDirection(vector) {
      vector.x = this.elements[8];
      vector.y = this.elements[9];
      vector.z = this.elements[10];
      return vector;
    }
  }

  return {
    Vector3: Vector3,
    Euler: Euler,
    Quaternion: Quaternion,
    Matrix4: Matrix4
  };
}
