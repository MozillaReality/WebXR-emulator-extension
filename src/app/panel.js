const port = chrome.runtime.connect(null, {name: 'panel'});
const tabId = chrome.devtools.inspectedWindow.tabId;

Element.prototype.setAttributes = function (attrs) {
  for (var idx in attrs) {
      if ((idx === 'styles' || idx === 'style') && typeof attrs[idx] === 'object') {
          for (var prop in attrs[idx]){this.style[prop] = attrs[idx][prop];}
      } else if (idx === 'html') {
          this.innerHTML = attrs[idx];
      } else {
          this.setAttribute(idx, attrs[idx]);
      }
  }
};

// receive message from contentScript via background

port.onMessage.addListener(message => {
  switch (message.action) {
    case 'webxr-startup':
      // notify the poses to sync
      // if main page is reloaded while panel is opened
      notifyPoses();
      break;
    case 'device-pose':
      // @TODO: Make function?
      {
        const node = assetNodes[DEVICE.HEADSET];
        if (!node) {
          return;
        }
        node.position.fromArray(message.position);
        node.quaternion.fromArray(message.quaternion);
        updateHeadsetPropertyComponent();
        render();
      }
      break;
    case 'device-input-pose':
      {
        // @TODO: Make function?
        const objectName = message.objectName;
        const key = objectName === 'rightController' ? DEVICE.RIGHT_CONTROLLER : DEVICE.LEFT_CONTROLLER;
        const node = assetNodes[key];
        if (!node) {
          return;
        }
        node.position.fromArray(message.position);
        node.quaternion.fromArray(message.quaternion);
        updateDeviceTransformData(key);
        render();
      }
      break;
    case 'device-enter-immersive':
      states.inImmersive = true;
      notifyPoses();
      break;
    case 'device-leave-immersive':
      states.inImmersive = false;
      break;
  }
});

// send message to contentScript via background

const postMessage = (message) => {
  message.tabId = tabId;
  port.postMessage(message);
};

const notifyPoseChange = (node) => {
  postMessage({
    action: 'webxr-pose',
    position: node.position.toArray([]), // @TODO: reuse array
    quaternion: node.quaternion.toArray([]) // @TODO: reuse array
  });
};

const notifyInputPoseChange = (key, node) => {
  postMessage({
    action: 'webxr-input-pose',
    objectName: OBJECT_NAME[key],
    position: node.position.toArray([]), // @TODO: reuse array
    quaternion: node.quaternion.toArray([]) // @TODO: reuse array
  });
};

const notifyInputButtonPressed = (key, buttonKey, pressed) => {
  postMessage({
    action: 'webxr-input-button',
    objectName: OBJECT_NAME[key],
    buttonIndex: buttonKey,
    pressed: pressed
  });
};

const notifyInputAxisValue = (key, axisIndex, value) => {
  postMessage({
    action: 'webxr-input-axis',
    objectName: OBJECT_NAME[key],
    axisIndex: axisIndex,
    value: value
  });
};

const notifyDeviceChange = (deviceDefinition) => {
  postMessage({
    action: 'webxr-device',
    deviceDefinition: deviceDefinition
  });
};

const notifyStereoEffectChange = (enabled) => {
  postMessage({
    action: 'webxr-stereo-effect',
    enabled: enabled
  });
};

const notifyPoses = () => {
  for (const key in assetNodes) {
    if (assetNodes[key]) {
      if (key === DEVICE.HEADSET) {
        notifyPoseChange(assetNodes[key]);
      } else {
        notifyInputPoseChange(key, assetNodes[key]);
      }
    }
  }
};

const notifyExitImmersive = () => {
  postMessage({
    action: 'webxr-exit-immersive'
  });
};

//

const IMMERSIVE_MODE = {
  NONE: 0,
  VR: 1,
  AR: 2
};

const DEVICE = {
  HEADSET: '0',
  CONTROLLER: '1', // use this in case you don't distinguish left/right
  RIGHT_CONTROLLER: '2',
  LEFT_CONTROLLER: '3',
  POINTER: '4',
  TABLET: '5'
};

const BUTTON = {
  SELECT: 0,
  SQUEEZE: 1
};

const XR_STANDARD_GAMEPAD_POLYFILL_MAPPING = {
  BUTTONS: {
    'xr-standard-trigger': 0,
    'xr_standard-squeeze': 1,
    'xr_standard-touchpad': 2,
    'xr_standard-thumbstick': 3
  },
  AXES: {
    'xr-standard-touchpad-x': 0,
    'xr-standard-touchpad-y': 1,
    'xr-standard-thumbstick-x': 2,
    'xr-standard-thumbstick-y': 3
  }
}

const ASSET_PATH = {};
ASSET_PATH[DEVICE.HEADSET] = '../../assets/headset.obj';
ASSET_PATH[DEVICE.CONTROLLER] = '../../assets/oculus-go-controller.glb';

const OBJECT_NAME = {};
OBJECT_NAME[DEVICE.HEADSET] = 'headset';
OBJECT_NAME[DEVICE.RIGHT_CONTROLLER] = 'rightController';
OBJECT_NAME[DEVICE.LEFT_CONTROLLER] = 'leftController';

const states = {
  inImmersive: false,
  buttonPressed: {},
  immersiveMode: IMMERSIVE_MODE.NONE
};
states.buttonPressed[DEVICE.RIGHT_CONTROLLER] = {};
states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.SELECT] = false;
states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.SQUEEZE] = false;
states.buttonPressed[DEVICE.LEFT_CONTROLLER] = {};
states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.SELECT] = false;
states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.SQUEEZE] = false;

const deviceCapabilities = {};
deviceCapabilities[DEVICE.HEADSET] = {
  hasPosition: false,
  hasRotation: false
};
deviceCapabilities[DEVICE.CONTROLLER] = {
  hasPosition: false,
  hasRotation: false,
  hasSqueezeButton: false
};

const transformControls = {};
transformControls[DEVICE.HEADSET] = null;
transformControls[DEVICE.RIGHT_CONTROLLER] = null;
transformControls[DEVICE.LEFT_CONTROLLER] = null;

const assetNodes = {};
assetNodes[DEVICE.HEADSET] = null;
assetNodes[DEVICE.RIGHT_CONTROLLER] = null;
assetNodes[DEVICE.LEFT_CONTROLLER] = null;

// @TODO: Currently the values are　groundless.
//        Set more appropriate values.
const defaultTransforms = {};
defaultTransforms[DEVICE.HEADSET] = {
  position: new THREE.Vector3(0, 1.6, 0),
  rotation: new THREE.Euler(0, 0, 0)
};
defaultTransforms[DEVICE.RIGHT_CONTROLLER] = {
  position: new THREE.Vector3(0.5, 1.5, -1.0),
  rotation: new THREE.Euler(0, 0, 0)
};
defaultTransforms[DEVICE.LEFT_CONTROLLER] = {
  position: new THREE.Vector3(-0.5, 1.5, -1.0),
  rotation: new THREE.Euler(0, 0, 0)
};
// The parameters should be shared with ARScene.js
defaultTransforms[DEVICE.POINTER] = {
  position: new THREE.Vector3(0.0, 1.6, -0.15),
  rotation: new THREE.Euler(0, 0, 0)
};
defaultTransforms[DEVICE.TABLET] = {
  position: new THREE.Vector3(0.0, 1.6, -0.2),
  rotation: new THREE.Euler(0, 0, 0)
};

// initialize Three.js objects

// renderer

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(1, 1);
document.getElementById('renderComponent').appendChild(renderer.domElement);

// Canvas size relying on browser's flexbox
// then waiting for the flex box determines the size.
const onResize = () => {
  const div = document.getElementById('renderComponent');
  renderer.setSize(1, 1);
  // Not sure if 1ms is long enough but seems working fine for now.
  setTimeout(() => {
    const width = div.offsetWidth;
    const height = div.offsetHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
  }, 1);
};

onResize();

// scene, camera, light, grid

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3f3f3);

const camera = new THREE.PerspectiveCamera(45, 1 / 1, 0.1, 100);
camera.position.set(-3, 3, 4);
camera.lookAt(new THREE.Vector3(0, 2, 0));

const render = () => {
  renderer.render(scene, camera);
};

const light = new THREE.DirectionalLight(0xffffff);
light.position.set(-1, 1, -1);
scene.add(light);

const gridHelper = new THREE.GridHelper(20, 20);
scene.add(gridHelper);

// orbit controls for camera

const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
orbitControls.addEventListener('change', render);
orbitControls.target.set(0, 2, 0);
orbitControls.update(); // seems like this line is necessary if I set non-zero as target

// transform controls for device assets

const createTransformControls = (target, onChange) => {
  const controls = new THREE.TransformControls(camera, renderer.domElement);
  controls.setSpace('local');
  controls.attach(target);
  controls.setSize(1.5);
  controls.enabled = false;
  controls.visible = false;

  controls.addEventListener('mouseDown', () => {
    orbitControls.enabled = false;
  }, false);

  controls.addEventListener('mouseUp', () => {
    orbitControls.enabled = true;
  }, false);

  controls.addEventListener('change', () => {
    onChange();
    render();
  }, false);

  return controls;
};

// @TODO: Rename
const setupTransformControlsMode = (controls, capabilities) => {
  // change the mode if the device doesn't support
  if (controls.enabled) {
    // Translate -> Rotate -> Disable
    if (controls.getMode() === 'translate' && !capabilities.hasPosition) {
      controls.setMode('rotate');
    }
    if (controls.getMode() === 'rotate' && !capabilities.hasRotation) {
      controls.visible = false;
      controls.enabled = false;
    }
  }
};

// device assets

const loadHeadsetAsset = () => {
  new THREE.OBJLoader().load(ASSET_PATH[DEVICE.HEADSET], headset => {
    const parent = new THREE.Object3D();
    parent.position.copy(defaultTransforms[DEVICE.HEADSET].position);
    parent.rotation.copy(defaultTransforms[DEVICE.HEADSET].rotation);
    headset.rotation.y = -Math.PI;

    scene.add(parent.add(headset));
    assetNodes[DEVICE.HEADSET] = parent;

    const onChange = () => {
      updateHeadsetPropertyComponent();
      notifyPoseChange(parent);
    };

    const controls = createTransformControls(parent, onChange);
    scene.add(controls);
    transformControls[DEVICE.HEADSET] = controls;
    onChange();
    render();
  });
};

const loadControllersAsset = (loadRight, loadLeft) => {
  new THREE.GLTFLoader().load(ASSET_PATH[DEVICE.CONTROLLER], gltf => {
    const baseController = gltf.scene;
    baseController.scale.multiplyScalar(6);

    const recursivelyClone = (node) => {
      const cloneWithMaterial = (object) => {
        const clonedObject = object.clone();
        // @TODO: support material array?
        if (clonedObject.material) {
          clonedObject.material = clonedObject.material.clone();
        }
        return clonedObject;
      };
      const traverse = (object, parent) => {
        const clonedObject = cloneWithMaterial(object);
        if (parent) {
          parent.add(clonedObject);
        }
        for (const child of object.children) {
          traverse(child, clonedObject);
        }
        return clonedObject;
      };
      return traverse(node);
    };

    const setupController = (key) => {
      const parent = new THREE.Object3D();
      const controller = recursivelyClone(baseController);

      // @TODO: Simplify
      let keyForDefaultTransform = key;
      if (states.immersiveMode === IMMERSIVE_MODE.AR) {
        keyForDefaultTransform = key === DEVICE.RIGHT_CONTROLLER ? DEVICE.POINTER :
              key === DEVICE.LEFT_CONTROLLER ? DEVICE.TABLET :
              key;
      }

      parent.position.copy(defaultTransforms[keyForDefaultTransform].position);
      parent.rotation.copy(defaultTransforms[keyForDefaultTransform].rotation);
      parent.add(controller);

      scene.add(parent);

      assetNodes[key] = parent;

      const onChange = () => {
        updateDeviceTransformData(key);
        notifyInputPoseChange(key, parent);
      };

      const checkboxId = key === DEVICE.RIGHT_CONTROLLER ?
        'rightControllerCheckbox' : 'leftControllerCheckbox';

      const controls = createTransformControls(parent, onChange);
      scene.add(controls);
      transformControls[key] = controls;
      onChange();
    };

    if (loadRight) {
      setupController(DEVICE.RIGHT_CONTROLLER);
    }

    if (loadLeft) {
      setupController(DEVICE.LEFT_CONTROLLER);
    }

    render();
  });
};

const updateAssetNodes = (deviceDefinition) => {
  // @TODO: Move more proper place to check?
  const modes = deviceDefinition.modes;
  // @TODO: What if the device supports both immersive-vr and immersive-ar?
  states.immersiveMode = modes.includes('immersive-ar') ? IMMERSIVE_MODE.AR :
                         modes.includes('immersive-vr') ? IMMERSIVE_MODE.VR :
                         IMMERSIVE_MODE.NONE;

  // Workaround for a bug in Three.js r110 that
  // default material can be shared across GLTFLoader.
  // So even if we load gltf asset with a new GLTFLoader instance
  // it can return the same default material instance then
  // controller material color won't be reset.
  // To resolve the issue, explicilty reseting the color here.
  // @TODO: Remove this workaround if the issue is fixed in Three.js side.
  if (assetNodes[DEVICE.RIGHT_CONTROLLER]) {
    states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.SELECT] = false;
    states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.SQUEEZE] = false;
    updateControllerColor(DEVICE.RIGHT_CONTROLLER);
  }
  if (assetNodes[DEVICE.LEFT_CONTROLLER]) {
    states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.SELECT] = false;
    states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.SQUEEZE] = false;
    updateControllerColor(DEVICE.LEFT_CONTROLLER);
  }

  // firstly remove all existing resources and disable all panel controls

  for (const key in assetNodes) {
    const node = assetNodes[key];
    const controls = transformControls[key];

    if (!node) {
      continue;
    }

    if (node.parent) {
      node.parent.remove(node);
    }

    controls.detach();

    assetNodes[key] = null;
    transformControls[key] = null;
  }

  deviceCapabilities[DEVICE.HEADSET].hasPosition = false;
  deviceCapabilities[DEVICE.HEADSET].hasRotation = false;
  deviceCapabilities[DEVICE.CONTROLLER].hasPosition = false;
  deviceCapabilities[DEVICE.CONTROLLER].hasRotation = false;
  deviceCapabilities[DEVICE.CONTROLLER].hasSqueezeButton = false;
  document.getElementById('stereoEffectLabel').style.display = 'none';
  document.getElementById('headsetComponent').style.display = 'none';
  document.getElementById('resetPoseButton').style.display = 'none';
  document.getElementById('exitButton').style.display = 'none';

  // secondly load new assets and enable necessary panel controls

  const hasImmersiveVR = deviceDefinition.modes && !! deviceDefinition.modes.includes('immersive-vr');
  const hasHeadset = !! deviceDefinition.headset;
  const hasRightController = deviceDefinition.controllers && deviceDefinition.controllers.length > 0;
  const hasLeftController = deviceDefinition.controllers && deviceDefinition.controllers.length > 1;

  deviceCapabilities[DEVICE.HEADSET].hasPosition = hasHeadset && deviceDefinition.headset.hasPosition;
  deviceCapabilities[DEVICE.HEADSET].hasRotation = hasHeadset && deviceDefinition.headset.hasRotation;
  deviceCapabilities[DEVICE.CONTROLLER].hasPosition = hasRightController && deviceDefinition.controllers[0].hasPosition;
  deviceCapabilities[DEVICE.CONTROLLER].hasRotation = hasRightController && deviceDefinition.controllers[0].hasRotation;
  deviceCapabilities[DEVICE.CONTROLLER].hasSqueezeButton = hasRightController && deviceDefinition.controllers[0].hasSqueezeButton;

  const hasPosition = deviceCapabilities[DEVICE.HEADSET].hasPosition ||
    deviceCapabilities[DEVICE.CONTROLLER].hasPosition;

  if (hasImmersiveVR) {
    document.getElementById('stereoEffectLabel').style.display = '';
  }

  if (hasHeadset) {
    loadHeadsetAsset();
    document.getElementById('headsetComponent').style.display = 'flex';
    document.getElementById('exitButton').style.display = '';
  }

  if (hasRightController || hasLeftController) {
    loadControllersAsset(hasRightController, hasLeftController);
  }

  if (hasHeadset || hasRightController || hasLeftController) {
    document.getElementById('resetPoseButton').style.display = '';
  }

  render();
};

const updateControllerColor = (key) => {
  const node = assetNodes[key];
  const pressed = states.buttonPressed[key][BUTTON.SELECT] || states.buttonPressed[key][BUTTON.SQUEEZE];
  node.traverse(object => {
    if (!object.material) {
      return;
    }
    // @TODO: Support material array?
    const material = object.material;
    // I tried .color first but the looking of the current controller
    // models didn't differ well with changing .color so using emissive instead for now.
    if (!material.emissive) {
      return;
    }
    if (material.userData.originalEmissive === undefined) {
      material.userData.originalEmissive = material.emissive.clone();
    }
    if (pressed) {
      // blue if button is being pressed
      // @TODO: what if the origial emissive is blue-ish?
      material.emissive.set(0x004e9c);
    } else {
      material.emissive.copy(material.userData.originalEmissive);
    }
  });
  render();
};

render();

// Raycasting for transform controls enable/disable

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let mousedownTime = null;
let intersectKey = null;
const thresholdTime = 300;

const raycast = event => {
  const rect = renderer.domElement.getBoundingClientRect();
  // left-top (0, 0), right-bottom (1, 1)
  const point = {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height
  };
  mouse.set(point.x * 2 - 1, -(point.y * 2) + 1);
  raycaster.setFromCamera(mouse, camera);
  const targetObjects = [];
  for (const key in assetNodes) {
    const node = assetNodes[key];
    if (node) {
      targetObjects.push(node);
    }
  }
  return raycaster.intersectObjects(targetObjects, true);
};

const getNearestIntersectedObjectKey = event => {
  // @TODO: Optimize
  const intersects = raycast(event);
  if (intersects.length === 0) {
    return null;
  }
  const intersect = intersects[0];
  let target = null;
  const check = object => {
    for (const key in assetNodes) {
      const node = assetNodes[key];
      if (!node) {
        continue;
      }
      if (object === node) {
        target = key;
      }
    }
  };
  check(intersect.object);
  intersect.object.traverseAncestors(check);
  return target;
};

renderer.domElement.addEventListener('mousedown', event => {
  intersectKey = getNearestIntersectedObjectKey(event);
  mousedownTime = performance.now();
}, false);

renderer.domElement.addEventListener('mouseup', event => {
  if (intersectKey === null) {
    return;
  }
  const currentTime = performance.now();
  if (currentTime - mousedownTime < thresholdTime) {
    toggleControlMode(intersectKey);
    // We add event listener to transformControls mouseUp event to set orbitControls.enabled true.
    // But if disabling transformControls, its mouseUp event won't be fired.
    // Then setting orbitControls.enabled true here as workaround.
    orbitControls.enabled = true;
  }
}, false);

// event handlers

const updateDevicePropertyContent = (positionId, rotationId, position, rotation) => {
  if (document.getElementById(positionId)) {
    document.getElementById(positionId).textContent =
    position.x.toFixed(2) + ' ' + position.y.toFixed(2) + ' ' + position.z.toFixed(2);
  }
  
  if (document.getElementById(rotationId)) {
    document.getElementById(rotationId).textContent =
    rotation.x.toFixed(2) + ' ' + rotation.y.toFixed(2) + ' ' + rotation.z.toFixed(2);
  }
};

const updateHeadsetPropertyComponent = () => {
  const headset = assetNodes[DEVICE.HEADSET];
  if (!headset) { return; }
  updateDevicePropertyContent('headsetPosition', 'headsetRotation',
    headset.position, headset.rotation);
};

const updateDeviceTransformData = (deviceId) => {
  const device = assetNodes[deviceId];
  if (!device) { return; }
  let deviceIdPrefix = "device"+deviceId;
  updateDevicePropertyContent(
    deviceIdPrefix + "Position", deviceIdPrefix + "Rotation", 
    device.position, device.rotation
  );
};

// Show/Hide device property component

const addShowHideToDevicePropertyComponent = (devicePropertyComponent) => {
  const title = devicePropertyComponent.getElementsByClassName('title-bar')[0];
  const content = devicePropertyComponent.getElementsByClassName('device-property-content')[0];
  const icon = title.getElementsByClassName('icon')[0];
  title.addEventListener('click', event => {
    if (content.style.display === 'none') {
      icon.innerHTML = '&#9660;';
      content.style.display = 'flex';
    } else {
      icon.innerHTML = '&#9654;';
      content.style.display = 'none';
    }
  }, false);
}

for (const component of document.getElementsByClassName('device-property-component')) {
  // Expects device-property-component class has a title-bar class element and
  // a device-property-content class element as children
  addShowHideToDevicePropertyComponent(component);
}

document.getElementById('devicePropertiesExpandIcon').addEventListener('click', event => {
  const component = document.getElementById('devicePropertiesComponent');
  if (component.style.display === 'none') {
    component.style.display = 'flex';
    event.target.innerHTML = '&#9660;';
  } else {
    component.style.display = 'none';
    event.target.innerHTML = '&#9654;';
  }
  onResize();
}, false);

window.addEventListener('resize', event => {
  onResize();
}, false);

const toggleControlMode = (key) => {
  const controls = transformControls[key];
  if (!controls) {
    return;
  }
  // Translate -> Rotate -> Disable -> Translate -> ...
  if (!controls.enabled) {
    controls.enabled = true;
    controls.visible = true;
    controls.setMode('translate');
  } else if (controls.getMode() === 'translate') {
    controls.setMode('rotate');
  } else {
    controls.enabled = false;
    controls.visible = false;
  }
  setupTransformControlsMode(controls,
    deviceCapabilities[key === DEVICE.HEADSET ? key : DEVICE.CONTROLLER]);
  render();
};

document.getElementById('resetPoseButton').addEventListener('click', event => {
  for (const key in assetNodes) {
    const device = assetNodes[key];

    if (!device) {
      continue;
    }

    let defaultTransformKey = key;
    // @TODO: Simplify
    if (states.immersiveMode === IMMERSIVE_MODE.AR) {
      defaultTransformKey = key === DEVICE.RIGHT_CONTROLLER ? DEVICE.POINTER :
                            key === DEVICE.LEFT_CONTROLLER ? DEVICE.TABLET :
                            key;
    }
    device.position.copy(defaultTransforms[defaultTransformKey].position);
    device.rotation.copy(defaultTransforms[defaultTransformKey].rotation);
  }
  updateHeadsetPropertyComponent();
  updateDeviceTransformData(DEVICE.RIGHT_CONTROLLER);
  updateDeviceTransformData(DEVICE.LEFT_CONTROLLER);
  notifyPoses();
  render();
}, false);

document.getElementById('exitButton').addEventListener('click', event => {
  notifyExitImmersive();
}, false);

// copy values to clipboard on click
const onTransformFieldClick = event => {
  const el = event.target;
  navigator.clipboard.writeText(el.innerHTML.split(' ').join(', '));
}

for (const field of document.getElementsByClassName('value')) {
  field.addEventListener('click', onTransformFieldClick, false);
  field.title = 'Click to copy to clipboard';
}

// setup configurations and start
// 1. load external devices.json file
// 2. set up dom elements from it
// 3. load configuration from storage and load assets

const handednessToDeviceInfo = (handedness) => {
  switch (handedness) {
    case "left":
      return { id: DEVICE.LEFT_CONTROLLER, name: "Left Controller" };
    case "right":
      return { id: DEVICE.RIGHT_CONTROLLER, name: "Right Controller" };
    case "left-right-none":
    case "left-right":
    case "any":
      return { id: DEVICE.CONTROLLER, name: "Controller" };;
    default:
      throw "handedness not supported";
  }
}

const INPUT_STATE = {
  IDLE: 0,
  PRESSED: 1,
  FULLY_PRESSED: 2,
  DISABLED: 3,
};

let inputStates = {};

const inputButtonAction = (handedness, inputName, buttonPolyfillIndex) => {
  let deviceId = handednessToDeviceInfo(handedness).id;
  let inputId = handedness + '-' + inputName;
  switch (inputStates[inputId]) {
    case INPUT_STATE.IDLE:
      inputStates[inputId] = INPUT_STATE.FULLY_PRESSED;
      break;
    case INPUT_STATE.PRESSED:
      // half-pressed triggers will be fully pressed when clicked
      inputStates[inputId] = INPUT_STATE.FULLY_PRESSED;
      break;
    case INPUT_STATE.FULLY_PRESSED:
      inputStates[inputId] = INPUT_STATE.IDLE;
      break;
    case INPUT_STATE.DISABLED:
      // show prompt that the button is not exposed by WebXR Polyfill
      break;
  }
  const pressed = inputStates[inputId] === INPUT_STATE.FULLY_PRESSED;
  notifyInputButtonPressed(deviceId, buttonPolyfillIndex, pressed);
  document.getElementById(inputId).classList.toggle('pressed', pressed);
  updateControllerColor(deviceId);
};

const inputAxisAction = (handedness, axisPolyfillIndex, value) => {
  let deviceId = handednessToDeviceInfo(handedness).id;
  notifyInputAxisValue(deviceId, axisPolyfillIndex, value);
}

let intervalJobIds = [];

const resetJoystick = (joystickElementId, autoReturn) => {
  let joystickContainer = document.getElementById(joystickElementId)
  joystickContainer.innerHTML = '';
  let joystick = new Joystick(100, autoReturn);
  joystick.addToParent(joystickContainer);
  return joystick;
}

const createControllerComponent = (deviceProfile, handedness, polyfillInputMapping) => {
  const fakeXrInputSource = {
    profiles: [deviceProfile],
    handedness: handedness,
  }
  fetchProfile(fakeXrInputSource, DEFAULT_PROFILES_PATH).then(({profile, _assetPath}) => {
    let layout = profile.layouts[handedness];
    const deviceId = handednessToDeviceInfo(handedness).id;
    const deviceName = handednessToDeviceInfo(handedness).name;
    const controllerComponent = document.createElement('div');
    document
      .getElementById('devicePropertiesComponent')
      .append(controllerComponent);
    controllerComponent.id = handedness + 'ControllerComponent';
    controllerComponent.className = 'component device-property-component';
    controllerComponent.classList.add('generated-controller-component');
    const titleBar = document.createElement('div');
    controllerComponent.append(titleBar);
    titleBar.className = 'title-bar';
    titleBar.innerHTML = '<span class="icon">&#9660;</span>' + deviceName;
    const inputs = document.createElement('div');
    controllerComponent.append(inputs);
    inputs.className = 'component device-property-content';

    // generate transform data elements
    let deviceIdPrefix = "device" + deviceId;
    const positionDiv = document.createElement('div');
    positionDiv.innerHTML = '<span class="key">position:</span> <span class="value" id="' + deviceIdPrefix + 'Position"></span>';
    const rotationDiv = document.createElement('div');
    rotationDiv.innerHTML = '<span class="key">rotation:</span> <span class="value" id="' + deviceIdPrefix + 'Rotation"></span>';
    inputs.append(positionDiv);
    inputs.append(rotationDiv);

    // generate xr-standard-thumbstick ui elements
    if (layout['components']['xr-standard-thumbstick']) {
      let joystickContainerDiv = document.createElement('div');
      inputs.append(joystickContainerDiv);
      let joystickDiv = document.createElement('div');
      joystickDiv.id = deviceIdPrefix + "-joystick";
      joystickDiv.classList.add('horizontal-half-container');
      joystickContainerDiv.append(joystickDiv);
      let joystickMenuDiv = document.createElement('div');
      joystickMenuDiv.classList.add('horizontal-half-container');
      joystickMenuDiv.style.marginTop = "20px";
      joystickContainerDiv.append(joystickMenuDiv);
      let joystickValuesDiv = document.createElement('div');
      joystickMenuDiv.append(joystickValuesDiv);
      let joystickResetButton = document.createElement('button');
      joystickResetButton.innerHTML = "reset";
      joystickMenuDiv.append(joystickResetButton);
      joystickMenuDiv.append(document.createElement('br'));
      let joystickReturnCheckbox = document.createElement('input');
      joystickReturnCheckbox.setAttributes({
        'type': 'checkbox',
        'id': deviceIdPrefix + '-joystick-return',
        'name': deviceIdPrefix + '-joystick-return',
        'value': 'AutoReturn',
        'checked': true
      });
      joystickMenuDiv.append(joystickReturnCheckbox);
      let joystickReturnLabel = document.createElement('label');
      joystickReturnLabel.setAttribute('for', deviceIdPrefix + "-joystick-return");
      joystickReturnLabel.innerHTML = 'Auto return';
      joystickMenuDiv.append(joystickReturnLabel);

      let joystick = resetJoystick(joystickDiv.id, joystickReturnCheckbox.checked);
      joystickReturnCheckbox.addEventListener('change', event => {
        // console.log( joystickReturnCheckbox.checked);
        joystick = resetJoystick(joystickDiv.id, joystickReturnCheckbox.checked);
      }, false);
      joystickResetButton.addEventListener('click', event => {
        joystick = resetJoystick(joystickDiv.id, joystickReturnCheckbox.checked);
      }, false);

      intervalJobIds.push(setInterval(function(){
        let x = joystick.getX();
        // y axis input is inverted
        let y = joystick.getY();
        joystickValuesDiv.innerHTML = "X axis: " + x + "<br>Y axis: " + y;

        let xIndex = polyfillInputMapping['axes'][XR_STANDARD_GAMEPAD_POLYFILL_MAPPING.AXES['xr-standard-thumbstick-x']];
        let yIndex = polyfillInputMapping['axes'][XR_STANDARD_GAMEPAD_POLYFILL_MAPPING.AXES['xr-standard-thumbstick-y']];
        
        inputAxisAction(handedness, xIndex, x);
        inputAxisAction(handedness, yIndex, y);
      }, 50));
    }

    // generate button ui elements
    for (let inputName in layout['components']) {
      let inputId = handedness + '-' + inputName;
      inputStates[inputId] = INPUT_STATE.IDLE;
      const inputWrapper = document.createElement('div');
      inputs.append(inputWrapper);
      const input = document.createElement('button');
      inputWrapper.append(input);
      input.className = 'trigger-button';
      input.id = inputId;
      input.innerHTML = inputName;
      const inputData = layout['components'][inputName];
      let gamepadIndex = XR_STANDARD_GAMEPAD_POLYFILL_MAPPING.BUTTONS[inputName];
      if (!gamepadIndex) {
        gamepadIndex = inputData['gamepadIndices']['button'];
      }
      const inputPolyfillIndex = polyfillInputMapping['buttons'][gamepadIndex];
      if (inputPolyfillIndex !== null && inputPolyfillIndex !== undefined) {
        input.addEventListener('click', event => {
          inputButtonAction(handedness, inputName, inputPolyfillIndex);
        }, false);
      } else if (inputData['reserved']) {
        input.disabled = true;
        input.setAttribute('title', "input reserved per WebXR specs");
      } else {
        input.disabled = true;
        input.setAttribute('title', "input exists according to WebXR Input Profile, but is not exposed by WebXR Polyfill");
      }
    }

    // add show/hide to controller components
    addShowHideToDevicePropertyComponent(controllerComponent);

    // init transform values for controllers
    updateDeviceTransformData(deviceId);
  });
};

const DEFAULT_PROFILES_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles';

const createControllersUI = (manager) => {
  // clean up all previously generated controller components
  document.querySelectorAll('.generated-controller-component').forEach(e => e.remove());

  // clean up interval jobs from previously generated controllers
  intervalJobIds.forEach(id => clearInterval(id));
  intervalJobIds = [];
  
  if (manager.deviceDefinition.profile) {
    for (let controller of manager.deviceDefinition.controllers) {
      let deviceProfile = manager.deviceDefinition.profile;
      let polyfillInputMapping = manager.deviceDefinition.polyfillInputMapping;
      if (deviceProfile) {
        createControllerComponent(deviceProfile, controller.handedness, polyfillInputMapping);
      }
    }
  }
}

ConfigurationManager.createFromJsonFile('src/devices.json').then(manager => {
  const deviceSelect = document.getElementById('deviceSelect');
  const stereoCheckbox = document.getElementById('stereoCheckbox');

  // set up devices select element

  // Assuming the order of Object.keys() isn't predictable.
  // Alphabetical sort first and then place 'None' at top of the list.
  const devices = manager.devices;
  const deviceKeys = Object.keys(devices).sort();
  if (deviceKeys.includes('None')) {
    deviceKeys.splice(deviceKeys.indexOf('None'), 1);
    deviceKeys.unshift('None');
  }
  for (const key of deviceKeys) {
    const deviceDefinition = devices[key];
    const option = document.createElement('option');
    option.text = deviceDefinition.name;
    option.value = key;
    if (key === manager.defaultDeviceKey) {
      option.selected = true;
    }
    deviceSelect.add(option);
  }

  createControllersUI(manager);

  // setup stereo effect checkbox element

  stereoCheckbox.checked = manager.defaultStereoEffect;

  // update assets and store configuration if selects are changed

  const onChange = () => {
    const deviceKey = deviceSelect.children[deviceSelect.selectedIndex].value;
    const stereoEffect = stereoCheckbox.checked;

    const deviceKeyIsUpdated = manager.updateDeviceKey(deviceKey);
    const stereoEffectIsUpdated = manager.updateStereoEffect(stereoEffect);

    if (deviceKeyIsUpdated || stereoEffectIsUpdated) {
      manager.storeToStorage().then(storedValues => {
        // console.log(storedValues);
      });
    }

    if (deviceKeyIsUpdated) {
      notifyDeviceChange(manager.deviceDefinition);
      updateAssetNodes(manager.deviceDefinition);
      createControllersUI(manager);
    }

    if (stereoEffectIsUpdated) {
      notifyStereoEffectChange(stereoEffect);
    }
  };

  deviceSelect.addEventListener('change', onChange);
  stereoCheckbox.addEventListener('change', onChange);

  // load configuration and then load assets

  manager.loadFromStorage().then(result => {
    const deviceKey = manager.deviceKey;
    const stereoEffect = manager.stereoEffect;

    for (let index = 0; index < deviceSelect.children.length; index++) {
      const option = deviceSelect.children[index];
      if (option.value === deviceKey) {
        deviceSelect.selectedIndex = index;
        break;
      }
    }

    stereoCheckbox.checked = stereoEffect;
    updateAssetNodes(manager.deviceDefinition);
  });
}).catch(error => {
  console.error(error);
});
