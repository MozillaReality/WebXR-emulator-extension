import XRPose from 'webxr-polyfill/src/api/XRPose';

export default class XRJointPose extends XRPose {
  constructor(transform, emulatedPosition) {
    super(transform, emulatedPosition);
    this.radius = 0.01; // @TODO: Implement properly
  }
}
