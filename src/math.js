// inspired by Three.js Math libs

function MathInjection() {
  class Vector3 {
    constructor(x, y, z) {
      this.x = x || 0;
      this.y = y || 0;
      this.z = z || 0;
    }

    toArray(array, offset = 0) {
      array[offset + 0] = this.x;
      array[offset + 1] = this.y;
      array[offset + 2] = this.z;
      return array;
    }

    fromArray(array, offset = 0) {
      this.x = array[offset + 0];
      this.y = array[offset + 1];
      this.z = array[offset + 2];
      return this;
    }

    copy(v) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
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

    applyMatrix3(m) {
      const x = this.x;
      const y = this.y;
      const z = this.z;
      const e = m.elements;

      this.x = e[0] * x + e[3] * y + e[6] * z;
      this.y = e[1] * x + e[4] * y + e[7] * z;
      this.z = e[2] * x + e[5] * y + e[8] * z;

      return this;
    }

    applyMatrix4(m) {
      const x = this.x;
      const y = this.y;
      const z = this.z;
      const e = m.elements;

      const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);

      this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
      this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
      this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;

      return this;
    }
  }

  class Vector4 {
    constructor(x, y, z, w) {
      this.x = x || 0;
      this.y = y || 0;
      this.z = z || 0;
      this.w = w || 0;
    }

    toArray(array, offset = 0) {
      array[offset + 0] = this.x;
      array[offset + 1] = this.y;
      array[offset + 2] = this.z;
      array[offset + 3] = this.w;
      return array;
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

    toArray(array, offset = 0) {
      array[offset + 0] = this.x;
      array[offset + 1] = this.y;
      array[offset + 2] = this.z;
      array[offset + 3] = this.w;

      return array;
    }

    fromArray(array, offset = 0) {
      this.x = array[offset + 0];
      this.y = array[offset + 1];
      this.z = array[offset + 2];
      this.w = array[offset + 3];
      return this;
    }

    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }

    normalize() {
      const l = this.length();

      if (l === 0) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 1;
      } else {
        l = 1 / l;
        this.x = this.x * l;
        this.y = this.y * l;
        this.z = this.z * l;
        this.w = this.w * l;
      }

      return this;
    }

    setFromAxisAngle(axis, angle) {
      const halfAngle = angle / 2;
      const s = Math.sin(halfAngle);

      this.x = axis.x * s;
      this.y = axis.y * s;
      this.z = axis.z * s;
      this.w = Math.cos(halfAngle);

      return this;
    }

    multiply(q) {
      const qax = this.x;
      const qay = this.y;
      const qaz = this.z;
      const qaw = this.w;

      const qbx = q.x;
      const qby = q.y;
      const qbz = q.z;
      const qbw = q.w;

      this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
      this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
      this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
      this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

      return this;
    }
  }

  class Matrix3 {
    constructor() {
      this.elements = new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
      ]);
    }

    setFromMatrix4(m) {
      const te = this.elements;
      const me = m.elements;
      te[0] = me[0];
      te[1] = me[1];
      te[2] = me[2];
      te[3] = me[4];
      te[4] = me[5];
      te[5] = me[6];
      te[6] = me[8];
      te[7] = me[9];
      te[8] = me[10];
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

    toArray(array, offset = 0) {
      for (let i = 0; i < 16; i++) {
        array[offset + i] = this.elements[i];
      }
      return array;
    }

    copy(matrix) {
      for (let i = 0; i < 16; i++) {
        this.elements[i] = matrix.elements[i];
      }
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

    makePerspective(left, right, top, bottom, near, far) {
      const te = this.elements;
      const x = 2 * near / (right - left);
      const y = 2 * near / (top - bottom);

      const a = (right + left) / (right - left);
      const b = (top + bottom) / (top - bottom);
      const c = -(far + near) / (far - near);
      const d = -2 * far * near / (far - near);

      te[0] = x;
      te[1] = 0;
      te[2] = 0;
      te[3] = 0;
      te[4] = 0;
      te[5] = y;
      te[6] = 0;
      te[7] = 0;
      te[8] = a;
      te[9] = b;
      te[10] = c;
      te[11] = -1;
      te[12] = 0;
      te[13] = 0;
      te[14] = d;
      te[15] = 0;

      return this;
    }
  }

  return {
    Vector3: Vector3,
    Vector4: Vector4,
    Euler: Euler,
    Quaternion: Quaternion,
    Matrix3: Matrix3,
    Matrix4: Matrix4
  };
}
