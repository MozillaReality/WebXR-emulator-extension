import XRPose from 'webxr-polyfill/src/api/XRPose';

export const PRIVATE = Symbol('@@webxr-polyfill/XRTransientInputHitTestResult');

export default class XRTransientInputHitTestResult {
  constructor(frame, results, inputSource) {
    this[PRIVATE] = {
      frame,
      inputSource,
      results
    };
  }

  get inputSource() {
    return this[PRIVATE].inputSource;
  }

  get results() {
    return this[PRIVATE].results;
  }
}
