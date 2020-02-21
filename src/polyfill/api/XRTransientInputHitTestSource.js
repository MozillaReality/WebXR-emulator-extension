export const PRIVATE = Symbol('@@webxr-polyfill/XRTransientInputHitTestSource');

export default class XRTransientInputHitTestSource {
  constructor(options) {
    this[PRIVATE] = {
      space: options.space
    };
  }

  cancel() {
    // @TODO: Implement
  }
}
