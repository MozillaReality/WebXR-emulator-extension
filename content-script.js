const port = chrome.runtime.connect({name: 'contentScript'});

const dispatchCustomEvent = (type, detail) => {
  window.dispatchEvent(new CustomEvent(type, {
    detail: typeof cloneInto !== 'undefined' ? cloneInto(detail, window) : detail
  }));
};

// receive message from panel via background

port.onMessage.addListener(message => {
  switch (message.action) {
    case 'webxr-pose':
      dispatchCustomEvent('webxr-pose', {
        objectName: message.objectName,
        position: message.position,
        quaternion: message.quaternion
      });
      break;

    case 'webxr-button':
      dispatchCustomEvent('webxr-button', {
        objectName: message.objectName,
        pressed: message.pressed
      });
      break;
  }
});

// Synchronously adding WebXR polyfill because
// some applications for example Three.js WebVR examples
// check if WebXR is available by synchronously checking
// navigator.xr, window.XR or whatever.

const source =  'let xrDeviceManager;'
+ '(function() {'
+   'const _Math = (' + MathInjection + ')();'
+   'const XRDeviceManager = (' + XRDeviceManagerInjection + ')();'
+   'const XRDevice = (' + XRDeviceInjection + ')();'
+   'const Headset = (' + HeadsetInjection + ')();'
+   'const Controller = (' + ControllerInjection + ')();'
+   '(' + WebXRPolyfillInjection + ')();'
+   'xrDeviceManager = new XRDeviceManager();'
//+   'console.log(this);' // to check if loaded
+ '})();';
const script = document.createElement('script');
script.textContent = source;
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);

// No synchronous storage and fetch APIS so reluctantly
// reflecting configuration asynchronously

fetch(chrome.runtime.getURL('./devices.json'))
  .then(response => response.json())
  .then(json => {
    loadConfiguration(json)
  }).catch(error => {
    console.error(error);
  });

const loadConfiguration = (deviceJson) => {
  const configurationId = 'webxr-extension';
  chrome.storage.local.get(configurationId, result => {
    const script2 = document.createElement('script');
    const source2 = ''
    + '(function() {'
    +   'xrDeviceManager'
    +   '.setup(JSON.parse(\'' + JSON.stringify(deviceJson) + '\'))'
    +   '.deserialize(\'' + (result[configurationId] || '') + '\');'
    // +   'console.log(xrDeviceManager);' // to check if loaded
    + '})();';
    script2.textContent = source2;
    (document.head || document.documentElement).appendChild(script2);
    script2.parentNode.removeChild(script2);

    port.postMessage({
      action: 'webxr-startup'
    });
  });
};