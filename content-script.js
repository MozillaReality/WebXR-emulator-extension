// Synchronously adding WebXR polyfill because
// some applications for example Three.js WebVR examples
// check if WebXR is available by synchronously checking
// navigator.xr, window.XR or whatever.

const source =  'let xrDeviceManager;'
+ '(function() {'
+   'const _Math = (' + MathInjection + ')();'
+   'const XRDeviceManager = (' + XRDeviceManagerInjection + ')();'
+   'const XRDeviceBase = (' + XRDeviceBaseInjection + ')();'
+   'const OculusGoDevice = (' + OculusGoDeviceInjection + ')();'
+   'const OculusQuestDevice = (' + OculusQuestDeviceInjection + ')();'
+   'const Headset = (' + HeadsetInjection + ')();'
+   'const Controller = (' + ControllerInjection + ')();'
+   '(' + WebXRPolyfillInjection + ')();'
+   'xrDeviceManager = new XRDeviceManager();'
+   'console.log(this);'
+ '})();';
const script = document.createElement('script');
script.textContent = source;
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);

// No synchronous storage API so reluctantly
// reflecting configuration asynchronously

const configurationId = 'webxr-extension';

chrome.storage.local.get(configurationId, result => {
  const script2 = document.createElement('script');
  const source2 = ''
  + '(function() {'
  +   'xrDeviceManager.deserialize(\'' + (result[configurationId] || '') + '\');'
  +   'console.log(xrDeviceManager);'
  + '})();';
  script2.textContent = source2;
  (document.head || document.documentElement).appendChild(script2);
  script2.parentNode.removeChild(script2);
});
