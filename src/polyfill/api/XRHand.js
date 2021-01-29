import XRJointSpace from './XRJointSpace';
import XRHandJoint from './XRHandJoint';

export default class XRHand {
  constructor(inputSource) {
    this.size = 25;
    this.joints = new Map();
    const jointNames = Object.keys(XRHandJoint);
    for (const jointName of jointNames) {
      const jointSpace = new XRJointSpace({
        name: jointName,
        hand: this
      }, undefined, inputSource);
      this.joints.set(jointName, jointSpace);
    }
  }

  get(jointName) {
    return this.joints.get(jointName);
  }

  values() {
    return this.joints.values();
  }

  keys() {
    return this.joints.keys();
  }

  joint(jointIndex) {
    // @TODO: Implement
    throw new Error('XRHand.joint is not implemented yet.');
  }
}
