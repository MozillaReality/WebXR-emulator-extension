import WebXRPolyfill from 'webxr-polyfill/src/WebXRPolyfill';
import XR from 'webxr-polyfill/src/api/XR';
import XRSession from 'webxr-polyfill/src/api/XRSession';
import API from 'webxr-polyfill/src/api/index';
import EmulatedXRDevice from './EmulatedXRDevice';

export default class CustomWebXRPolyfill extends WebXRPolyfill {
  constructor() {
    super();

    // Note: Experimental.
    //       Override some XR APIs to track active immersive session to
    //       enable to exit immersive by the extension.
    //       Exiting out of user gesture might violate security policy
    //       so there might be a chance that we remove this feature at some point.

    let activeImmersiveSession = null;
    const originalRequestSession = XR.prototype.requestSession;
    XR.prototype.requestSession = function(mode, enabledFeatures) {
      return originalRequestSession.call(this, mode, enabledFeatures).then(session => {
        if (mode === 'immersive-vr') {
          activeImmersiveSession = session;
        }
        return session;
      });
    };

    const originalEnd = XRSession.prototype.end;
    XRSession.prototype.end = function () {
      return originalEnd.call(this).then(() => {
        if (activeImmersiveSession === this) {
          activeImmersiveSession = null;
        }
      });
    };

    window.addEventListener('webxr-exit-immersive', event => {
      if (activeImmersiveSession && !activeImmersiveSession.ended) {
        activeImmersiveSession.end().then(() => {
          activeImmersiveSession = null;
        });
      }
    });

    // Note: Even if native WebXR API is available the extension overrides
    //       it with WebXR polyfill because the extension doesn't work with
    //       the native one (yet).
    if (this.nativeWebXR) {
      console.log('WebXR emulator extension overrides native WebXR API with polyfill.');
    }

    // Note: Regardless whether native WebXR API is available we set up read-only WebXR API
    //       in global scope by using Object.defineProperties() because
    //       1. In case native WebXR API is available.
    //          We override them with WebXR polyfill as commented above
    //       2. In case native WebXR API isn't available, meaning WebXR API polyfill is injected in
    //          parent constructor.
    //          The WebXR API polyfill can be overriden by native WebXR API on Chrome
    //          after CustomWebXRPolyfill is instanciated if WebXR origin-trial is set in a web page.
    //          To prevent the override we define WebXR API again as read-only in global scope.
    const defines = {};
    for (const className of Object.keys(API)) {
      defines[className] = {
        // We don't use value because window.foo = bar will throw an error in strict mode
        get: () => { return API[className]; },
        set: (value) => {}
      };
    }
    Object.defineProperties(this.global, defines);

    if (this.nativeWebXR) {
      this.injected = true;
      this._patchNavigatorXR();
    }
  }

  _patchNavigatorXR() {
    const devicePromise = requestXRDevice(this.global);
    this.xr = new XR(devicePromise);
    Object.defineProperty(this.global.navigator, 'xr', {
      value: this.xr,
      configurable: true,
    });
  }
}

const requestXRDevice = async function (global, config) {
  // resolve when receiving configuration parameters from content-script as an event
  return new Promise((resolve, reject) => {
    const callback = (event) => {
      window.removeEventListener('webxr-device-init', callback);
      resolve(new EmulatedXRDevice(global,
        Object.assign({},
          event.detail.deviceDefinition,
          {stereoEffect: event.detail.stereoEffect}
        )));
    };
    window.addEventListener('webxr-device-init', callback, false);
  });
};
