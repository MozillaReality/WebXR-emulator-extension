export const PRIVATE = Symbol('@@webxr-polyfill/XRHitTestSource');

import XRRay from './XRRay';

export default class XRHitTestSource {
  constructor(session, options) {
    // @TODO: Support options.entityTypes and options.offsetRay
    if (options.entityTypes && options.entityTypes.length > 0) {
      throw new Error('XRHitTestSource does not support entityTypes option yet.');
    }
    this[PRIVATE] = {
      session,
      space: options.space,
      offsetRay: options.offsetRay || new XRRay()
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

  get _offsetRay() {
    return this[PRIVATE].offsetRay;
  }
}
