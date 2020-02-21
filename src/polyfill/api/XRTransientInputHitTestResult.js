import XRPose from 'webxr-polyfill/src/api/XRPose';

export const PRIVATE = Symbol('@@webxr-polyfill/XRTransientInputHitTestResult');

export default class XRTransientInputHitTestResult {
  constructor(transform) {
    this[PRIVATE] = {
      transform
    };
  }

  getPose(baseSpace) {
    // @TODO: Implement properly
    return new XRPose(this[PRIVATE].transform);
  }
}
