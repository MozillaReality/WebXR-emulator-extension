const port = chrome.runtime.connect({name: 'contentScript'});

const dispatchCustomEvent = (type, detail) => {
  window.dispatchEvent(new CustomEvent(type, {
    detail: typeof cloneInto !== 'undefined' ? cloneInto(detail, window) : detail
  }));
};

// receive message from panel via background
// and transfer to polyfill as event on window

port.onMessage.addListener(message => {
  switch (message.action) {
    case 'webxr-device':
      dispatchCustomEvent('webxr-device', {
        deviceDefinition: message.deviceDefinition
      });
      break;

    case 'webxr-pose':
      dispatchCustomEvent('webxr-pose', {
        position: message.position,
        quaternion: message.quaternion
      });
      break;

    case 'webxr-input-pose':
      dispatchCustomEvent('webxr-input-pose', {
        objectName: message.objectName,
        position: message.position,
        quaternion: message.quaternion
      });
      break;

    case 'webxr-input-button':
      dispatchCustomEvent('webxr-input-button', {
        objectName: message.objectName,
        pressed: message.pressed,
        buttonIndex: message.buttonIndex
      });
      break;

    case 'webxr-input-axis':
      dispatchCustomEvent('webxr-input-axis', {
        objectName: message.objectName,
        value: message.value,
        axisIndex: message.axisIndex
      });
      break;

    case 'webxr-stereo-effect':
      dispatchCustomEvent('webxr-stereo-effect', {
        enabled: message.enabled
      });
      break;

    case 'webxr-exit-immersive':
      dispatchCustomEvent('webxr-exit-immersive', {});
      break;
  }
});

// Set up listeners for events coming from EmulatedXRDevice.
// Transfer to panel via background.

window.addEventListener('device-pose', event => {
  port.postMessage({
    action: 'device-pose',
    position: event.detail.position,
    quaternion: event.detail.quaternion
  });
}, false);

window.addEventListener('device-input-pose', event => {
  port.postMessage({
    action: 'device-input-pose',
    objectName: event.detail.objectName,
    position: event.detail.position,
    quaternion: event.detail.quaternion
  });
}, false);

window.addEventListener('device-enter-immersive', event => {
  port.postMessage({
    action: 'device-enter-immersive'
  });
}, false);

window.addEventListener('device-leave-immersive', event => {
  port.postMessage({
    action: 'device-leave-immersive'
  });
}, false);

// Set up listeners for requests coming from EmulatedXRDevice.
// Send back the response with the result.

window.addEventListener('webxr-virtual-room-request', event => {
  fetch(chrome.runtime.getURL('assets/hall_empty.glb')).then(response => {
    return response.arrayBuffer();
  }).then(buffer => {
    dispatchCustomEvent('webxr-virtual-room-response', {
      buffer: buffer
    });
  });
}, false);


// function to load script in a web page

const loadScript = source => {
  const script = document.createElement('script');
  script.textContent = source;
  (document.head || document.documentElement).appendChild(script);
  script.parentNode.removeChild(script);
};

// Synchronously adding WebXR polyfill because
// some applications for example Three.js WebVR examples
// check if WebXR is available by synchronously checking
// navigator.xr , window.XR or whatever when the page is loaded.

loadScript(`
  (function() {
    (` + WebXRPolyfillInjection + `)();
    const polyfill = new CustomWebXRPolyfill();
    //console.log(this); // to check if loaded
  })();
`);

// No synchronous storage and fetch APIs so reluctantly
// reflecting configuration asynchronously

ConfigurationManager.createFromJsonFile('src/devices.json').then(manager => {
  manager.loadFromStorage().then(() => {
    // send the configuration parameters to the polyfill as an event
    dispatchCustomEvent('webxr-device-init', {
      deviceDefinition: manager.deviceDefinition,
      stereoEffect: manager.stereoEffect
    });
    port.postMessage({
      action: 'webxr-startup'
    });
  });
}).catch(error => {
  console.error(error);
});
