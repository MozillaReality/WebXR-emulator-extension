import XRSpace from 'webxr-polyfill/src/api/XRSpace';

export const PRIVATE = Symbol('@@webxr-polyfill/XRJointSpace');

export default class XRJointSpace extends XRSpace {
  constructor(joint, specialType, inputSource) {
    super(specialType, inputSource);
    this[PRIVATE] = {
      jointName: joint.name,
      hand: joint.hand,
      joint: joint
    };
  }

  get jointName() {
    return this[PRIVATE].jointName;
  }
}
