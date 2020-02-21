export const PRIVATE = Symbol('@@webxr-polyfill/XRHitTestSource');

export default class XRHitTestSource {
  constructor(session, options) {
    // @TODO: Support options.entityTypes and options.offsetRay
    if (options.entityTypes && options.entityTypes.length > 0) {
      throw new Error('XRHitTestSource does not support entityTypes option yet.');
    }
    if (options.offsetRay) {
      throw new Error('XRHitTestSource does not support offsetRay option yet.');
    }
    this[PRIVATE] = {
      session,
      space: options.space
    };
  }

  cancel() {
    // @TODO: Implement
    throw new Error('cancel() is not implemented yet.');
  }

  get _space() {
    return this[PRIVATE].space;
  }

  get _session() {
    return this[PRIVATE].session;
  }
}
