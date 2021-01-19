export default class XRHand {
  constructor(inputSource) {
    this.length = 25;
    for (let i = 0; i < this.length; i++) {
      this[i] = new XRJointSpace({
        index: i,
        hand: this
      }, undefined, inputSource);
    }
  }

  joint(jointIndex) {
    // @TODO: Implement
    throw new Error('XRHand.joint is not implemented yet.');
  }
}

// Declare XRHand static properties.
// Pure rollup doesn't seem to accept static class properties
// so using XRHand.foo = num; style instead.
XRHand.WRIST = 0;
XRHand.THUMB_METACARPAL = 1;
XRHand.THUMB_PHALANX_PROXIMAL = 2;
XRHand.THUMB_PHALANX_DISTAL = 3;
XRHand.THUMB_PHALANX_TIP = 4;
XRHand.INDEX_METACARPAL = 5;
XRHand.INDEX_PHALANX_PROXIMAL = 6;
XRHand.INDEX_PHALANX_INTERMEDIATE = 7;
XRHand.INDEX_PHALANX_DISTAL = 8;
XRHand.INDEX_PHALANX_TIP = 9;
XRHand.MIDDLE_METACARPAL = 10;
XRHand.MIDDLE_PHALANX_PROXIMAL = 11;
XRHand.MIDDLE_PHALANX_INTERMEDIATE = 12;
XRHand.MIDDLE_PHALANX_DISTAL = 13;
XRHand.MIDDLE_PHALANX_TIP = 14;
XRHand.RING_METACARPAL = 15;
XRHand.RING_PHALANX_PROXIMAL = 16;
XRHand.RING_PHALANX_INTERMEDIATE = 17;
XRHand.RING_PHALANX_DISTAL = 18;
XRHand.RING_PHALANX_TIP = 19;
XRHand.LITTLE_METACARPAL = 20;
XRHand.LITTLE_PHALANX_PROXIMAL = 21;
XRHand.LITTLE_PHALANX_INTERMEDIATE = 22;
XRHand.LITTLE_PHALANX_DISTAL = 23;
XRHand.LITTLE_PHALANX_TIP = 24;
