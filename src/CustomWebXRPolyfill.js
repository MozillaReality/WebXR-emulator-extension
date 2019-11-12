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
    //       Exiting without user gesture in the page might violate security policy
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

    if (this.nativeWebXR) {
      // Note: Even if native WebXR API is available the extension overrides
      //       it with WebXR polyfill because the extension doesn't work with
      //       the native one (yet).  　　　　overrideAPI(this.global);
      this.injected = true;
      this._patchNavigatorXR();
    } else {
      // Note: WebXR API polyfill can be overridden by native WebXR API on the latest Chrome 78
      //       after the extension is loaded but before loading page is completed
      //       if the native WebXR API is disabled via chrome://flags and the page includes
      //       WebXR origin trial.
      //       Here is a workaround. Check if XR class is native code when node is appended or
      //       the page is loaded. If it detects, override WebXR API with the polyfill.
      // @TODO: Remove this workaround if the major browser officially support native WebXR API
      let overridden = false;
      const overrideIfNeeded = () => {
        if (overridden) { return false; }
        if (isNativeFunction(this.global.XR)) {
          overrideAPI(this.global);
          overridden = true;
          return true;
        }
        return false;
      };
      const observer = new MutationObserver(list => {
        for (const record of list) {
          for (const node of record.addedNodes) {
            if (node.localName === 'script' && overrideIfNeeded()) {
              observer.disconnect();
              break;
            }
          }
          if (overridden) { break; }
        }
      });
      observer.observe(document, {subtree: true, childList: true});
      const onLoad = event => {
        if (!overridden) {
          observer.disconnect();
          overrideIfNeeded();
        }
        document.removeEventListener('DOMContentLoaded', onLoad);
      };
      document.addEventListener('DOMContentLoaded', onLoad);
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

const requestXRDevice = async (global, config) => {
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

// Easy native function detection.
const isNativeFunction = func => {
  return /\[native code\]/i.test(func.toString());
};

const overrideAPI = function (global) {
  console.log('WebXR emulator extension overrides native WebXR API with polyfill.');
  for (const className in API) {
    global[className] = API[className];
  }
};
