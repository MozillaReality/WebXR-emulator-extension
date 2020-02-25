export const PRIVATE = Symbol('@@webxr-polyfill/XRRay');
import XRRigidTransform from 'webxr-polyfill/src/api/XRRigidTransform';
import {
  vec3,
  vec4,
  mat4
} from 'gl-matrix';

export default class XRRay {
  constructor(origin, direction) {
    const _origin = {x: 0, y: 0, z: 0, w: 1};
    const _direction = {x: 0, y: 0, z: -1, w: 0};

    if (origin && origin instanceof XRRigidTransform) {
      const transform = origin;
      const matrix = transform.matrix;
      const originVec4 = vec4.set(vec4.create(), _origin.x, _origin.y, _origin.z, _origin.w) ;
      const directionVec4 = vec4.set(vec4.create(), _direction.x, _direction.y, _direction.z, _direction.w);
      vec4.transformMat4(originVec4, originVec4, matrix);
      vec4.transformMat4(directionVec4, directionVec4, matrix);
      _origin.x = originVec4[0];
      _origin.y = originVec4[1];
      _origin.z = originVec4[2];
      _origin.w = originVec4[3];
      _directionVec4.x = directionVec4[0];
      _directionVec4.y = directionVec4[1];
      _directionVec4.z = directionVec4[2];
      _directionVec4.w = directionVec4[3];
    } else {
      if (origin) {
        _origin.x = origin.x;
        _origin.y = origin.y;
        _origin.z = origin.z;
        _origin.w = origin.w;
      } 
      if (direction) {
        _direction.x = direction.x;
        _direction.y = direction.y;
        _direction.z = direction.z;
        _direction.w = direction.w;
      }
    }

    // Normalize direction
    const length = Math.sqrt(_direction.x * _direction.x +
      _direction.y * _direction.y + _direction.z * _direction.z) || 1;
    _direction.x = _direction.x / length;
    _direction.y = _direction.y / length;
    _direction.z = _direction.z / length;

    this[PRIVATE] = {
      origin: new DOMPointReadOnly(_origin.x, _origin.y, _origin.z, _origin.w),
      direction: new DOMPointReadOnly(_direction.x, _direction.y, _direction.z, _direction.w),
      matrix: null
    };
  }

  get origin() {
    return this[PRIVATE].origin;
  }

  get direction() {
    return this[PRIVATE].direction;
  }

  get matrix() {
    if (this[PRIVATE].matrix) {
      return this[PRIVATE].matrix;
    }
    // @TODO: Check if the calculation is correct
    const z = vec3.set(vec3.create(), 0, 0, -1);
    const origin = vec3.set(vec3.create(),
      this[PRIVATE].origin.x,
      this[PRIVATE].origin.y,
      this[PRIVATE].origin.z
    );
    const direction = vec3.set(vec3.create(),
      this[PRIVATE].direction.x,
      this[PRIVATE].direction.y,
      this[PRIVATE].direction.z
    );
    const axis = vec3.cross(vec3.create(), direction, z);
    const cosAngle = vec3.dot(direction, z);
    const rotation = mat4.create();
    if (cosAngle > -1 && cosAngle < 1) {
      mat4.fromRotation(rotation, Math.acos(cosAngle), axis);
    } else if (cosAngle === -1) {
      mat4.fromRotation(rotation, Math.acos(cosAngle), vec3.set(vec3.create(), 1, 0, 0));
    }
    const translation = mat4.fromTranslation(mat4.create(), origin);
    const matrix = mat4.multiply(mat4.create(), translation, rotation);
    this[PRIVATE].matrix = matrix;
    return matrix;
  }
}
