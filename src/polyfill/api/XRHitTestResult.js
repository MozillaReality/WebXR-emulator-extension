export const PRIVATE = Symbol('@@webxr-polyfill/XRHitTestResult');
import XRSpace from 'webxr-polyfill/src/api/XRSpace';
import {
  mat4
} from 'gl-matrix';

export default class XRHitTestResult {
  constructor(frame, transform) {
    this[PRIVATE] = {
      frame,
      transform
    };
  }

  getPose(baseSpace) {
    const space = new XRSpace();
    space._baseMatrix = mat4.copy(mat4.create(), this[PRIVATE].transform.matrix);
    return this[PRIVATE].frame.getPose(space, baseSpace);
  }
}
