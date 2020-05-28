export const PRIVATE = Symbol('@@webxr-polyfill/XRTransientInputHitTestSource');

export default class XRTransientInputHitTestSource {
  constructor(session, options) {
    // @TODO: Support options.entityTypes and options.offsetRay
    if (options.entityTypes && options.entityTypes.length > 0) {
      throw new Error('XRHitTestSource does not support entityTypes option yet.');
    }
    this[PRIVATE] = {
      session,
      profile: options.profile,
      offsetRay: options.offsetRay || new XRRay(),
      active: true
    };
  }

  cancel() {
    // @TODO: Throw InvalidStateError if active is already false
    this[PRIVATE].active = false;
  }

  get _profile() {
    return this[PRIVATE].profile;
  }

  get _session() {
    return this[PRIVATE].session;
  }

  get _offsetRay() {
    return this[PRIVATE].offsetRay;
  }

  get _active() {
    return this[PRIVATE].active;
  }
}
