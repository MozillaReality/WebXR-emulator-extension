const port = chrome.runtime.connect(null, {name: 'panel'});
const tabId = chrome.devtools.inspectedWindow.tabId;

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
        updateControllerPropertyComponent(key);
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

const notifyInputAxesMoved = (key, axesKey, value) => {
  postMessage({
    action: 'webxr-input-axes',
    objectName: OBJECT_NAME[key],
    axesIndex: axesKey,
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
  SQUEEZE: 1,
  TOUCHPAD: 2,
  THUMBSTICK: 3,
  ACTION_A: 4,
  ACTION_B: 5,
};

const AXES = {
  TOUCHPAD_X: 0,
  TOUCHPAD_Y: 1,
};

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
  axes: {},
  immersiveMode: IMMERSIVE_MODE.NONE
};
states.buttonPressed[DEVICE.RIGHT_CONTROLLER] = {};
states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.SELECT] = false;
states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.SQUEEZE] = false;
states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.TOUCHPAD] = false;
states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.THUMBSTICK] = false;
states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.ACTION_A] = false;
states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.ACTION_B] = false;
states.buttonPressed[DEVICE.LEFT_CONTROLLER] = {};
states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.SELECT] = false;
states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.SQUEEZE] = false;
states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.TOUCHPAD] = false;
states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.THUMBSTICK] = false;
states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.ACTION_A] = false;
states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.ACTION_B] = false;
states.axes[DEVICE.RIGHT_CONTROLLER] = {};
states.axes[DEVICE.RIGHT_CONTROLLER][AXES.TOUCHPAD_X] = 0;
states.axes[DEVICE.RIGHT_CONTROLLER][AXES.TOUCHPAD_Y] = 0;
states.axes[DEVICE.LEFT_CONTROLLER] = {};
states.axes[DEVICE.LEFT_CONTROLLER][AXES.TOUCHPAD_X] = 0;
states.axes[DEVICE.LEFT_CONTROLLER][AXES.TOUCHPAD_Y] = 0;

const deviceCapabilities = {};
deviceCapabilities[DEVICE.HEADSET] = {
  hasPosition: false,
  hasRotation: false
};
deviceCapabilities[DEVICE.CONTROLLER] = {
  hasPosition: false,
  hasRotation: false,
  hasSqueezeButton: false,
  isComplex: false
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
  rotation: new THREE.Euler(0, 0, 0),
  thumbstickAxes: [0, 0]
};
defaultTransforms[DEVICE.LEFT_CONTROLLER] = {
  position: new THREE.Vector3(-0.5, 1.5, -1.0),
  rotation: new THREE.Euler(0, 0, 0),
  thumbstickAxes: [0, 0]
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
        updateControllerPropertyComponent(key);
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
    states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.TOUCHPAD] = false;
    states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.THUMBSTICK] = false;
    states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.ACTION_A] = false;
    states.buttonPressed[DEVICE.RIGHT_CONTROLLER][BUTTON.ACTION_B] = false;
    updateControllerColor(DEVICE.RIGHT_CONTROLLER);
  }
  if (assetNodes[DEVICE.LEFT_CONTROLLER]) {
    states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.SELECT] = false;
    states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.SQUEEZE] = false;
    states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.TOUCHPAD] = false;
    states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.THUMBSTICK] = false;
    states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.ACTION_A] = false;
    states.buttonPressed[DEVICE.LEFT_CONTROLLER][BUTTON.ACTION_B] = false;
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
  deviceCapabilities[DEVICE.CONTROLLER].isComplex = false;
  document.getElementById('stereoEffectLabel').style.display = 'none';
  document.getElementById('headsetComponent').style.display = 'none';
  document.getElementById('rightControllerComponent').style.display = 'none';
  document.getElementById('leftControllerComponent').style.display = 'none';
  document.getElementById('rightThumbstick').style.display = 'none';
  document.getElementById('leftThumbstick').style.display = 'none';
  document.getElementById('resetPoseButton').style.display = 'none';
  document.getElementById('exitButton').style.display = 'none';
  document.getElementById('rightSelectButton').style.display = 'none';
  document.getElementById('leftSelectButton').style.display = 'none';
  document.getElementById('rightSqueezeButton').style.display = 'none';
  document.getElementById('leftSqueezeButton').style.display = 'none';
  document.getElementById('rightTouchpadButton').style.display = 'none';
  document.getElementById('leftTouchpadButton').style.display = 'none';
  document.getElementById('rightThumbstickButton').style.display = 'none';
  document.getElementById('leftThumbstickButton').style.display = 'none';
  document.getElementById('rightActionAButton').style.display = 'none';
  document.getElementById('leftActionAButton').style.display = 'none';
  document.getElementById('rightActionBButton').style.display = 'none';
  document.getElementById('leftActionBButton').style.display = 'none';
  updateTriggerButtonColor(DEVICE.RIGHT_CONTROLLER, BUTTON.SELECT, false);
  updateTriggerButtonColor(DEVICE.RIGHT_CONTROLLER, BUTTON.SQUEEZE, false);
  updateTriggerButtonColor(DEVICE.RIGHT_CONTROLLER, BUTTON.TOUCHPAD, false);
  updateTriggerButtonColor(DEVICE.RIGHT_CONTROLLER, BUTTON.THUMBSTICK, false);
  updateTriggerButtonColor(DEVICE.RIGHT_CONTROLLER, BUTTON.ACTION_A, false);
  updateTriggerButtonColor(DEVICE.RIGHT_CONTROLLER, BUTTON.ACTION_B, false);
  updateTriggerButtonColor(DEVICE.LEFT_CONTROLLER, BUTTON.SELECT, false);
  updateTriggerButtonColor(DEVICE.LEFT_CONTROLLER, BUTTON.SQUEEZE, false);
  updateTriggerButtonColor(DEVICE.LEFT_CONTROLLER, BUTTON.TOUCHPAD, false);
  updateTriggerButtonColor(DEVICE.LEFT_CONTROLLER, BUTTON.THUMBSTICK, false);
  updateTriggerButtonColor(DEVICE.LEFT_CONTROLLER, BUTTON.ACTION_A, false);
  updateTriggerButtonColor(DEVICE.LEFT_CONTROLLER, BUTTON.ACTION_B, false);

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
  deviceCapabilities[DEVICE.CONTROLLER].isComplex = hasRightController && deviceDefinition.controllers[0].isComplex;

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

  if (hasRightController) {
    document.getElementById('rightControllerComponent').style.display = 'flex';
    if (hasImmersiveVR) {
      document.getElementById('rightSelectButton').style.display = '';
    }
    if (deviceCapabilities[DEVICE.CONTROLLER].hasSqueezeButton) {
      document.getElementById('rightSqueezeButton').style.display = '';
    }
    if (deviceCapabilities[DEVICE.CONTROLLER].isComplex) {
      document.getElementById('rightThumbstick').style.display = '';
      document.getElementById('rightThumbstickButton').style.display = '';
      document.getElementById('rightActionAButton').style.display = '';
      document.getElementById('rightActionBButton').style.display = '';
    } else {
      document.getElementById('rightTouchpadButton').style.display = '';
    }
  }

  if (hasLeftController) {
    document.getElementById('leftControllerComponent').style.display = 'flex';
    if (hasImmersiveVR) {
      document.getElementById('leftSelectButton').style.display = '';
    }
    if (deviceCapabilities[DEVICE.CONTROLLER].hasSqueezeButton) {
      document.getElementById('leftSqueezeButton').style.display = '';
    }
    if (deviceCapabilities[DEVICE.CONTROLLER].isComplex) {
      document.getElementById('leftThumbstick').style.display = '';
      document.getElementById('leftThumbstickButton').style.display = '';
      document.getElementById('leftActionAButton').style.display = '';
      document.getElementById('leftActionBButton').style.display = '';
    } else {
      document.getElementById('leftTouchpadButton').style.display = '';
    }
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
  document.getElementById(positionId).textContent =
    position.x.toFixed(2) + ' ' + position.y.toFixed(2) + ' ' + position.z.toFixed(2);
  document.getElementById(rotationId).textContent =
    rotation.x.toFixed(2) + ' ' + rotation.y.toFixed(2) + ' ' + rotation.z.toFixed(2);
};

const updateHeadsetPropertyComponent = () => {
  const headset = assetNodes[DEVICE.HEADSET];
  if (!headset) { return; }
  updateDevicePropertyContent('headsetPosition', 'headsetRotation',
    headset.position, headset.rotation);
};

const updateControllerPropertyComponent = (key) => {
  const controller = assetNodes[key];
  if (!controller) { return; }
  updateDevicePropertyContent(
    key === DEVICE.RIGHT_CONTROLLER ? 'rightControllerPosition' : 'leftControllerPosition',
    key === DEVICE.RIGHT_CONTROLLER ? 'rightControllerRotation' : 'leftControllerRotation',
    controller.position, controller.rotation
  );
};

const updateTriggerButtonColor = (key, buttonKey, pressed) => {
  let buttonId = key === DEVICE.RIGHT_CONTROLLER ? 'right' : 'left';
  switch(buttonKey) {
    case BUTTON.SELECT: buttonId += 'Select'; break;
    case BUTTON.SQUEEZE: buttonId += 'Squeeze'; break;
    case BUTTON.TOUCHPAD: buttonId += 'Touchpad'; break;
    case BUTTON.THUMBSTICK: buttonId += 'Thumbstick'; break;
    case BUTTON.ACTION_A: buttonId += 'ActionA'; break;
    case BUTTON.ACTION_B: buttonId += 'ActionB'; break;
  }
  buttonId += 'Button';
  const button = document.getElementById(buttonId);
  button.classList.toggle('pressed', pressed);
};

// Show/Hide device property component

for (const component of document.getElementsByClassName('device-property-component')) {
  // Expects device-property-component class has a title-bar class element and
  // a device-property-content class element as children
  const title = component.getElementsByClassName('title-bar')[0];
  const content = component.getElementsByClassName('device-property-content')[0];
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

const axesMoved = (key, axes, value) => {
  states.axes[key][axes] = value;
  notifyInputAxesMoved(key, axes, value);
};

const toggleButtonPressed = (key, buttonKey) => {
  states.buttonPressed[key][buttonKey] = !states.buttonPressed[key][buttonKey];
  const pressed = states.buttonPressed[key][buttonKey];
  notifyInputButtonPressed(key, buttonKey, pressed);
  updateTriggerButtonColor(key, buttonKey, pressed);
  updateControllerColor(key);
};

document.getElementById('rightSelectButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.RIGHT_CONTROLLER, BUTTON.SELECT);
}, false);

document.getElementById('leftSelectButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.LEFT_CONTROLLER, BUTTON.SELECT);
}, false);

document.getElementById('rightSqueezeButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.RIGHT_CONTROLLER, BUTTON.SQUEEZE);
}, false);

document.getElementById('leftTouchpadButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.LEFT_CONTROLLER, BUTTON.TOUCHPAD);
}, false);

document.getElementById('rightTouchpadButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.RIGHT_CONTROLLER, BUTTON.TOUCHPAD);
}, false);

document.getElementById('leftThumbstickButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.LEFT_CONTROLLER, BUTTON.THUMBSTICK);
}, false);

document.getElementById('rightThumbstickButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.RIGHT_CONTROLLER, BUTTON.THUMBSTICK);
}, false);

document.getElementById('leftSqueezeButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.LEFT_CONTROLLER, BUTTON.SQUEEZE);
}, false);

document.getElementById('rightActionAButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.RIGHT_CONTROLLER, BUTTON.ACTION_A);
}, false);

document.getElementById('leftActionAButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.LEFT_CONTROLLER, BUTTON.ACTION_A);
}, false);

document.getElementById('rightActionBButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.RIGHT_CONTROLLER, BUTTON.ACTION_B);
}, false);

document.getElementById('leftActionBButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.LEFT_CONTROLLER, BUTTON.ACTION_B);
}, false);

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
  updateControllerPropertyComponent(DEVICE.RIGHT_CONTROLLER);
  updateControllerPropertyComponent(DEVICE.LEFT_CONTROLLER);
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

  const joystick = new JoyStick(document.getElementById('renderComponent'));
  const leftThumbstick = joystick.add.axis({
    styles: { left: 35, bottom: 35, size: 75 },
  })
  leftThumbstick.onMove(({ right, top }) => {
    axesMoved(DEVICE.LEFT_CONTROLLER, AXES.TOUCHPAD_X, right);
    axesMoved(DEVICE.LEFT_CONTROLLER, AXES.TOUCHPAD_Y, -top);
    document.getElementById('leftThumbstick').textContent =
      right.toFixed(2) + ' ' + top.toFixed(2);
  })
  const rightThumbstick = joystick.add.axis({
    styles: { right: 35, bottom: 35, size: 75 },
  })
  rightThumbstick.onMove(({ right, top }) => {
    axesMoved(DEVICE.RIGHT_CONTROLLER, AXES.TOUCHPAD_X, right);
    axesMoved(DEVICE.RIGHT_CONTROLLER, AXES.TOUCHPAD_Y, -top);
    document.getElementById('rightThumbstick').textContent =
      right.toFixed(2) + ' ' + top.toFixed(2);
  })

  // document.getElementById('rightThumbstick').add

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
 class EventDispatcher {
  constructor () {
    this._listeners = {};
  }
  reset() {
    Object.keys(this._listeners).forEach(key => {
      delete this._listeners[key];
    });
  }
  addEventListener (eventName, listener) {
    const listeners = this._listeners;
    if (listeners[eventName] === undefined) {
      listeners[eventName] = [];
    }
    if (listeners[eventName].indexOf(listener) === -1) {
      listeners[eventName].push(listener);
    }
  }
  hasEventListener (eventName, listener) {
    return this._listeners[eventName] !== undefined && this._listeners[eventName].indexOf(listener) !== -1;
  }
  removeEventListener (eventNamer, listener) {
    const listenerArray = this._listeners[eventName];
    if (listenerArray !== undefined) {
      const index = listenerArray.indexOf(listener);
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }
  dispatchEvent( event) {
    const listenerArray = this._listeners[event.type];
    if (listenerArray !== undefined) {
      const array = listenerArray.slice(0);

      for (let i = 0; i < array.length; i++) {
        array[i].call(this, event);
      }
    }
  }
}

//  https://github.com/enable3d/enable3d/blob/eeaacad60f57b854ade6fd72a09746c5aeb5ff24/packages/common/src/misc/joystick.ts
 class JoyStick extends EventDispatcher {
  constructor(parentElement = document.body) {
    super()
    this.parentElement = parentElement;
    this.id = 0;
  }

  get add() {
    return {
      axis: (config = {}) => this.addAxis(config),
      button: (config = {}) => this.addButton(config)
    }
  }

  addAxis(config = {}) {
    this.id++
    const { styles = { left: 35, bottom: 35, size: 100 } } = config
    const circle = this.circle({ styles })
    const thumb = this.thumb({ styles })

    circle.appendChild(thumb)
    this.parentElement.appendChild(circle)

    const { maxRadius = 40, rotationDamping = 0.06, moveDamping = 0.01 } = config

    // element
    const element = {
      id: this.id,
      domElement: thumb,
      maxRadius: maxRadius,
      maxRadiusSquared: maxRadius * maxRadius,
      origin: { left: thumb.offsetLeft, top: thumb.offsetTop },
      offset: { x: 0, y: 0 },
      rotationDamping: rotationDamping,
      moveDamping: moveDamping
    }

    if (element && element.domElement) {
      const { domElement } = element
      if ('ontouchstart' in window) {
        domElement.addEventListener('touchstart', evt => {
          evt.preventDefault()
          this.tap(evt, element)
          evt.stopPropagation()
        })
      } else {
        domElement.addEventListener('mousedown', evt => {
          evt.preventDefault()
          this.tap(evt, element)
          evt.stopPropagation()
        })
      }
    }

    return {
      onMove: (event) => {
        this.addEventListener(`axis_onmove_${element.id}`, (delta) => {
          event(delta)
        })
      }
    }
  }

  addButton(config = {}) {
    this.id++
    const { styles = { right: 35, bottom: 35, size: 80 }, letter: l = 'A' } = config
    const circle = this.circle({ styles })
    const letter = this.letter({ letter: l })

    circle.appendChild(letter)
    this.parentElement.appendChild(circle)

    // element
    const element = {
      id: this.id,
      domElement: circle,
      offset: { x: 0, y: 0 }
    }

    if (element && element.domElement) {
      this.click(element)
    }

    return {
      onClick: (event) => {
        this.addEventListener(`button_onclick_${element.id}`, (data) => {
          event(data)
        })
      },
      onRelease: (event) => {
        this.addEventListener(`button_onrelease_${element.id}`, (data) => {
          event(data)
        })
      }
    }
  }
  circle(config = {}) {
    const { styles } = config
    const { top, right, bottom, left, size } = styles
    const circle = document.createElement('div')
    let css = `position:absolute; width:${size}px; height:${size}px; background:rgba(126, 126, 126, 0.5); border:#444 solid medium; border-radius:50%; cursor: pointer; `
    if (top) css += `top:${top}px; `
    if (right) css += `right:${right}px; `
    if (bottom) css += `bottom:${bottom}px; `
    if (left) css += `left:${left}px; `
    circle.style.cssText = css
    return circle
  }
  thumb(config = {}) {
    const { styles } = config
    const { size } = styles
    const thumb = document.createElement('div')
    thumb.style.cssText = `position: absolute; left: ${size / 4}px; top: ${size / 4}px; width: ${size / 2}px; height: ${
      size / 2
    }px; border-radius: 50%; background: #fff; `
    return thumb
  }
  letter(config = {}) {
    const { letter: l } = config
    const letter = document.createElement('span')
    letter.innerText = l
    letter.style.cssText =
      'position: absolute; text-align: center; top: 4px; width: 80px; height: 80px; font-size: 64px; color: #fff; '
    return letter
  }
  click(element) {
    const { id, domElement } = element
    if ('ontouchstart' in window) {
      domElement.addEventListener('touchstart', evt => {
        evt.preventDefault()
        this.dispatchEvent({ type: `button_onclick_${id}` })
      })
      domElement.addEventListener('touchend', evt => {
        evt.preventDefault()
        this.dispatchEvent({ type: `button_onrelease_${id}` })
      })
    } else {
      domElement.addEventListener('mousedown', evt => {
        evt.preventDefault()
        this.dispatchEvent({ type: `button_onclick_${id}` })
        evt.stopPropagation()
      })
      domElement.addEventListener('mouseup', evt => {
        evt.preventDefault()
        this.dispatchEvent({ type: `button_onrelease_${id}` })
        evt.stopPropagation()
      })
    }
  }
  tap(evt, element) {
    evt = evt || window.event
    // get the mouse cursor position at startup:
    element.offset = this.getMousePosition(evt)
    if ('ontouchstart' in window) {
      document.ontouchmove = evt => {
        if (evt.target === element.domElement) this.move(evt, element)
      }
      document.ontouchend = evt => {
        if (evt.target === element.domElement) this.up(element)
      }
    } else {
      document.onmousemove = evt => {
        if (evt.target === element.domElement) this.move(evt, element)
      }
      document.onmouseup = _evt => {
        this.up(element)
      }
    }
  }
  move(evt, element) {
    const { domElement, maxRadius, maxRadiusSquared, origin, offset, id } = element
    evt = evt || window.event
    const mouse = this.getMousePosition(evt)
    // calculate the new cursor position:
    let left = mouse.x - offset.x
    let top = mouse.y - offset.y
    //this.offset = mouse;
    const sqMag = left * left + top * top
    if (sqMag > maxRadiusSquared) {
      //Only use sqrt if essential
      const magnitude = Math.sqrt(sqMag)
      left /= magnitude
      top /= magnitude
      left *= maxRadius
      top *= maxRadius
    }
    // set the element's new position:
    domElement.style.top = `${top + domElement.clientHeight / 2}px`
    domElement.style.left = `${left + domElement.clientWidth / 2}px`
    const forward = -(top - origin.top + domElement.clientHeight / 2) / maxRadius
    const turn = (left - origin.left + domElement.clientWidth / 2) / maxRadius
    this.dispatchEvent({ type: `axis_onmove_${id}`, top: forward, right: turn })
  }
  up(element) {
    const { domElement, origin, id } = element
    if ('ontouchstart' in window) {
      document.ontouchmove = null
      // @ts-ignore
      document.touchend = null
    } else {
      document.onmousemove = null
      document.onmouseup = null
    }
    domElement.style.top = `${origin.top}px`
    domElement.style.left = `${origin.left}px`
    this.dispatchEvent({ type: `axis_onmove_${id}`, top: 0, right: 0 })
  }

  getMousePosition(evt) {
    // @ts-ignore
    const clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX
    // @ts-ignore
    const clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY
    return { x: clientX, y: clientY }
  }
}