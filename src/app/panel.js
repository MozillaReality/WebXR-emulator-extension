const port = chrome.runtime.connect(null, {name: 'panel'});
const tabId = chrome.devtools.inspectedWindow.tabId;

// receive message from contentScript via background

port.onMessage.addListener(message => {
  // notify the poses to sync
  // if main page is reloaded while panel is opened
  if (message.action === 'webxr-startup') {
    notifyPoses();
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

const notifyInputButtonPressed = (key, pressed) => {
  postMessage({
    action: 'webxr-input-button',
    objectName: OBJECT_NAME[key],
    pressed: pressed
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
      if (key === 'headset') {
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

const TRANSFORM_MODE = {
  TRANSLATE: 0,
  ROTATE: 1
};

const DEVICE = {
  HEADSET: '0',
  CONTROLLER: '1', // use this in case you don't distinguish left/right
  RIGHT_CONTROLLER: '2',
  LEFT_CONTROLLER: '3'
};

const ASSET_PATH = {};
ASSET_PATH[DEVICE.HEADSET] = '../../assets/headset.obj';
ASSET_PATH[DEVICE.CONTROLLER] = '../../assets/oculus-go-controller.gltf';

const OBJECT_NAME = {};
OBJECT_NAME[DEVICE.HEADSET] = 'headset';
OBJECT_NAME[DEVICE.RIGHT_CONTROLLER] = 'rightController';
OBJECT_NAME[DEVICE.LEFT_CONTROLLER] = 'leftController';

const states = {
  transformMode: TRANSFORM_MODE.ROTATE,
  buttonPressed: {}
};
states.buttonPressed[DEVICE.RIGHT_CONTROLLER] = false;
states.buttonPressed[DEVICE.LEFT_CONTROLLER] = false;

const deviceCapabilities = {};
deviceCapabilities[DEVICE.HEADSET] = {
  hasPosition: false,
  hasRotation: false
};
deviceCapabilities[DEVICE.CONTROLLER] = {
  hasPosition: false,
  hasRotation: false
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
  controls.setMode(states.transformMode === TRANSFORM_MODE.TRANSLATE ? 'translate' : 'rotate');
  controls.setSpace('local');
  controls.attach(target);
  controls.setSize(1.5);

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

const setupTransformControlsEnability = (controls, enabled, capabilities) => {
  controls.visible = enabled;
  controls.enabled = enabled;

  // disable if device doesn't have capability of current transform mode
  if (controls.enabled) {
    if ((states.transformMode === TRANSFORM_MODE.TRANSLATE && !capabilities.hasPosition) ||
        (states.transformMode === TRANSFORM_MODE.ROTATE && !capabilities.hasRotation)) {
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
    setupTransformControlsEnability(controls,
      document.getElementById('headsetCheckbox').checked,
      deviceCapabilities[DEVICE.HEADSET]);

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

      parent.position.copy(defaultTransforms[key].position);
      parent.rotation.copy(defaultTransforms[key].rotation);
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
      setupTransformControlsEnability(controls,
        document.getElementById(checkboxId).checked,
        deviceCapabilities[DEVICE.CONTROLLER]);

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

  states.buttonPressed[DEVICE.RIGHT_CONTROLLER] = false;
  states.buttonPressed[DEVICE.LEFT_CONTROLLER] = false;
  deviceCapabilities[DEVICE.HEADSET].hasPosition = false;
  deviceCapabilities[DEVICE.HEADSET].hasRotation = false;
  deviceCapabilities[DEVICE.CONTROLLER].hasPosition = false;
  deviceCapabilities[DEVICE.CONTROLLER].hasRotation = false;
  document.getElementById('headsetComponent').style.display = 'none';
  document.getElementById('rightControllerComponent').style.display = 'none';
  document.getElementById('leftControllerComponent').style.display = 'none';
  document.getElementById('transformModeButton').style.display = 'none';
  document.getElementById('resetPoseButton').style.display = 'none';
  document.getElementById('exitButton').style.display = 'none';
  updateTriggerButtonColor(DEVICE.RIGHT_CONTROLLER, false);
  updateTriggerButtonColor(DEVICE.LEFT_CONTROLLER, false);

  // secondly load new assets and enable necessary panel controls

  const hasHeadset = !! deviceDefinition.headset;
  const hasRightController = deviceDefinition.controllers && deviceDefinition.controllers.length > 0;
  const hasLeftController = deviceDefinition.controllers && deviceDefinition.controllers.length > 1;

  deviceCapabilities[DEVICE.HEADSET].hasPosition = hasHeadset && deviceDefinition.headset.hasPosition;
  deviceCapabilities[DEVICE.HEADSET].hasRotation = hasHeadset && deviceDefinition.headset.hasRotation;
  deviceCapabilities[DEVICE.CONTROLLER].hasPosition = hasRightController && deviceDefinition.controllers[0].hasPosition;
  deviceCapabilities[DEVICE.CONTROLLER].hasRotation = hasRightController && deviceDefinition.controllers[0].hasRotation;

  const hasPosition = deviceCapabilities[DEVICE.HEADSET].hasPosition ||
    deviceCapabilities[DEVICE.CONTROLLER].hasPosition;

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
    document.getElementById('rightTriggerButton').style.display = '';
  }

  if (hasLeftController) {
    document.getElementById('leftControllerComponent').style.display = 'flex';
    document.getElementById('leftTriggerButton').style.display = '';
  }

  if (hasHeadset || hasRightController || hasLeftController) {
    document.getElementById('resetPoseButton').style.display = '';
  }

  // expect if device has position capability it also has rotation capability
  if (hasPosition) {
    document.getElementById('transformModeButton').style.display = '';
  }

  // force to rotate mode if device doesn't have position capability
  if (!hasPosition && states.transformMode === TRANSFORM_MODE.TRANSLATE) {
    toggleControlMode();
  }

  render();
};

const updateControllerColor = (node, pressed) => {
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

const updateTriggerButtonColor = (key, pressed) => {
  const buttonId = key === DEVICE.RIGHT_CONTROLLER ? 'rightTriggerButton' : 'leftTriggerButton';
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

const onHeadsetCheckboxChange = () => {
  if (!transformControls[DEVICE.HEADSET]) {
    return;
  }

  setupTransformControlsEnability(transformControls[DEVICE.HEADSET],
    document.getElementById('headsetCheckbox').checked,
    deviceCapabilities[DEVICE.HEADSET]);
  render();
};

document.getElementById('headsetCheckbox')
  .addEventListener('change', onHeadsetCheckboxChange, false);


const onControllerCheckboxChange = (key) => {
  if (!transformControls[key]) {
    return;
  }

  const checkboxId = key === DEVICE.RIGHT_CONTROLLER
    ? 'rightControllerCheckbox' : 'leftControllerCheckbox';

  setupTransformControlsEnability(transformControls[key],
    document.getElementById(checkboxId).checked,
    deviceCapabilities[DEVICE.CONTROLLER]);
  render();
};

const onRightControllerCheckboxChange = () => {
  onControllerCheckboxChange(DEVICE.RIGHT_CONTROLLER);
};

document.getElementById('rightControllerCheckbox')
  .addEventListener('change', onRightControllerCheckboxChange, false);

const onLeftControllerCheckboxChange = () => {
  onControllerCheckboxChange(DEVICE.LEFT_CONTROLLER);
};

document.getElementById('leftControllerCheckbox')
  .addEventListener('change', onLeftControllerCheckboxChange, false);

const toggleControlMode = () => {
  states.transformMode = states.transformMode === TRANSFORM_MODE.TRANSLATE
    ? TRANSFORM_MODE.ROTATE : TRANSFORM_MODE.TRANSLATE;

  const isTranslateMode = states.transformMode === TRANSFORM_MODE.TRANSLATE;

  for (const key in transformControls) {
    const controls = transformControls[key];

    if (!controls) {
      continue;
    }

    const checkboxId =
      key === DEVICE.HEADSET ? 'headsetCheckbox' :
      key === DEVICE.RIGHT_CONTROLLER ? 'rightControllerCheckbox' :
      'leftControllerCheckbox';
    controls.setMode(isTranslateMode ? 'translate' : 'rotate');
    setupTransformControlsEnability(controls,
      document.getElementById(checkboxId).checked,
      deviceCapabilities[key === DEVICE.HEADSET ? DEVICE.HEADSET : DEVICE.CONTROLLER]);
  }

  document.getElementById('transformModeButton').textContent =
    isTranslateMode ? 'Translate' : 'Rotate';

  render();
};

document.getElementById('transformModeButton').addEventListener('click', event => {
  toggleControlMode();
}, false);

const toggleButtonPressed = key => {
  states.buttonPressed[key] = !states.buttonPressed[key];
  const pressed = states.buttonPressed[key];
  notifyInputButtonPressed(key, pressed);
  updateTriggerButtonColor(key, pressed);
  updateControllerColor(assetNodes[key], pressed);
};

document.getElementById('rightTriggerButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.RIGHT_CONTROLLER);
}, false);

document.getElementById('leftTriggerButton').addEventListener('click', event => {
  toggleButtonPressed(DEVICE.LEFT_CONTROLLER);
}, false);

document.getElementById('resetPoseButton').addEventListener('click', event => {
  for (const key in assetNodes) {
    const device = assetNodes[key];

    if (!device) {
      continue;
    }

    device.position.copy(defaultTransforms[key].position);
    device.rotation.copy(defaultTransforms[key].rotation);
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
  // Alphabetical sort first and the place 'None' at top of the list.
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
