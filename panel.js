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

const notifyInputPoseChange = (objectName, node) => {
  postMessage({
    action: 'webxr-input-pose',
    objectName: objectName,
    position: node.position.toArray([]), // @TODO: reuse array
    quaternion: node.quaternion.toArray([]) // @TODO: reuse array
  });
};

const notifyInputButtonPressed = (objectName, pressed) => {
  postMessage({
    action: 'webxr-input-button',
    objectName: objectName,
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

const states = {
  translateMode: false, // true: translate mode, false: rotate mode
  rightButtonPressed: false,
  leftButtonPressed: false
};

const deviceCapabilities = {
  headset: {
    hasPosition: false,
    hasRotation: false
  },
  controller: {
    hasPosition: false,
    hasRotation: false
  }
};

const transformControls = {
  headset: null,
  rightHand: null,
  leftHand: null
};

const assetNodes = {
  headset: null,
  rightHand: null,
  leftHand: null
};

// @TODO: Currently the values are　groundless.
//        Set more appropriate values.
const defaultTransforms = {
  headset: {
    position: new THREE.Vector3(0, 1.6, 0),
    rotation: new THREE.Euler(0, 0, 0)
  },
  rightHand: {
    position: new THREE.Vector3(0.5, 1.5, -1.0),
    rotation: new THREE.Euler(0, 0, 0)
  },
  leftHand: {
    position: new THREE.Vector3(-0.5, 1.5, -1.0),
    rotation: new THREE.Euler(0, 0, 0)
  }
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
  controls.setMode(states.translateMode ? 'translate' : 'rotate');
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
    if ((states.translateMode && !capabilities.hasPosition) ||
        (!states.translateMode && !capabilities.hasRotation)) {
      controls.enabled = false;
    }
  }
};

// device assets

const loadHeadsetAsset = () => {
  new THREE.OBJLoader().load('assets/headset.obj', headset => {
    const parent = new THREE.Object3D();
    parent.position.copy(defaultTransforms.headset.position);
    parent.rotation.copy(defaultTransforms.headset.rotation);
    headset.rotation.y = -Math.PI;

    scene.add(parent.add(headset));
    assetNodes.headset = parent;

    const onChange = () => {
      updateHeadsetPropertyComponent();
      notifyPoseChange(parent);
    };

    const controls = createTransformControls(parent, onChange);
    setupTransformControlsEnability(controls,
      document.getElementById('headsetCheckbox').checked,
      deviceCapabilities.headset);

    scene.add(controls);
    transformControls.headset = controls;
    onChange();
    render();
  });
};

const loadControllersAsset = (loadRight, loadLeft) => {
  new THREE.GLTFLoader().load('assets/oculus-go-controller.gltf', gltf => {
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

    // key: 'rightHand' or 'leftHand'
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

      const controls = createTransformControls(parent, onChange);
      setupTransformControlsEnability(controls,
        document.getElementById(key + 'Checkbox').checked,
        deviceCapabilities.controller);

      scene.add(controls);
      transformControls[key] = controls;
      onChange();
    };

    if (loadRight) {
      setupController('rightHand');
    }

    if (loadLeft) {
      setupController('leftHand');
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

  states.rightButtonPressed = false;
  states.leftButtonPressed = false;
  deviceCapabilities.headset.hasPosition = false;
  deviceCapabilities.headset.hasRotation = false;
  deviceCapabilities.controller.hasPosition = false;
  deviceCapabilities.controller.hasRotation = false;
  document.getElementById('headsetComponent').style.display = 'none';
  document.getElementById('rightControllerComponent').style.display = 'none';
  document.getElementById('leftControllerComponent').style.display = 'none';
  document.getElementById('translateButton').style.display = 'none';
  document.getElementById('resetPoseButton').style.display = 'none';
  document.getElementById('exitButton').style.display = 'none';
  updateTriggerButtonColor('rightHand', false);
  updateTriggerButtonColor('leftHand', false);

  // secondly load new assets and enable necessary panel controls

  const hasHeadset = !! deviceDefinition.headset;
  const hasRightController = deviceDefinition.controllers && deviceDefinition.controllers.length > 0;
  const hasLeftController = deviceDefinition.controllers && deviceDefinition.controllers.length > 1;

  deviceCapabilities.headset.hasPosition = hasHeadset && deviceDefinition.headset.hasPosition;
  deviceCapabilities.headset.hasRotation = hasHeadset && deviceDefinition.headset.hasRotation;
  deviceCapabilities.controller.hasPosition = hasRightController && deviceDefinition.controllers[0].hasPosition;
  deviceCapabilities.controller.hasRotation = hasRightController && deviceDefinition.controllers[0].hasRotation;

  const hasPosition = deviceCapabilities.headset.hasPosition || deviceCapabilities.controller.hasPosition;

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
    document.getElementById('rightPressButton').style.display = '';
  }

  if (hasLeftController) {
    document.getElementById('leftControllerComponent').style.display = 'flex';
    document.getElementById('leftPressButton').style.display = '';
  }

  if (hasHeadset || hasRightController || hasLeftController) {
    document.getElementById('resetPoseButton').style.display = '';
  }

  // expect if device has position capability it also has rotation capability
  if (hasPosition) {
    document.getElementById('translateButton').style.display = '';
  }

  // force to rotate mode if device doesn't have position capability
  if (!hasPosition && states.translateMode) {
    toggleTranslateMode();
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
      // redden if button is being pressed
      // @TODO: what if the origial emissive is red-ish?
      material.emissive.set(0x004e9c);
    } else {
      material.emissive.copy(material.userData.originalEmissive);
    }
  });
  render();
};

render();

// event handlers

const updateHeadsetPropertyComponent = () => {
  const headset = assetNodes.headset;
  if (!headset) { return; }
  const position = headset.position;
  const rotation = headset.rotation;
  document.getElementById('headsetPosition').textContent =
    position.x.toFixed(2) + ' ' + position.y.toFixed(2) + ' ' + position.z.toFixed(2);
  document.getElementById('headsetRotation').textContent =
    rotation.x.toFixed(2) + ' ' + rotation.y.toFixed(2) + ' ' + rotation.z.toFixed(2);
};

// key: 'rightHand' or 'leftHand'
const updateControllerPropertyComponent = (key) => {
  const hand = assetNodes[key];
  if (!hand) { return; }
  const position = hand.position;
  const rotation = hand.rotation;
  const positionId = key === 'rightHand' ? 'rightControllerPosition' : 'leftControllerPosition';
  const rotationId = key === 'rightHand' ? 'rightControllerRotation' : 'leftControllerRotation';
  document.getElementById(positionId).textContent =
    position.x.toFixed(2) + ' ' + position.y.toFixed(2) + ' ' + position.z.toFixed(2);
  document.getElementById(rotationId).textContent =
    rotation.x.toFixed(2) + ' ' + rotation.y.toFixed(2) + ' ' + rotation.z.toFixed(2);
};


const updateTriggerButtonColor = (key, pressed) => {
  const buttonId = key === 'rightHand' ? 'rightPressButton' : 'leftPressButton';
  const button = document.getElementById(buttonId);
  button.classList.toggle('pressed', pressed);
};

for (const component of document.getElementsByClassName('device-property-component')) {
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
  if (!transformControls.headset) {
    return;
  }

  setupTransformControlsEnability(transformControls.headset,
    document.getElementById('headsetCheckbox').checked,
    deviceCapabilities.headset);
  render();
};

document.getElementById('headsetCheckbox')
  .addEventListener('change', onHeadsetCheckboxChange, false);


// key: 'rightHand' or 'leftHand'
const onControllerCheckboxChange = (key) => {
  if (!transformControls[key]) {
    return;
  }

  setupTransformControlsEnability(transformControls[key],
    document.getElementById(key + 'Checkbox').checked,
    deviceCapabilities.controller);
  render();
};

const onRightHandCheckboxChange = () => {
  onControllerCheckboxChange('rightHand');
};

document.getElementById('rightHandCheckbox')
  .addEventListener('change', onRightHandCheckboxChange, false);

const onLeftHandCheckboxChange = () => {
  onControllerCheckboxChange('leftHand');
};

document.getElementById('leftHandCheckbox')
  .addEventListener('change', onLeftHandCheckboxChange, false);

const toggleTranslateMode = () => {
  states.translateMode = !states.translateMode;

  for (const key in transformControls) {
    const controls = transformControls[key];

    if (!controls) {
      continue;
    }

    controls.setMode(states.translateMode ? 'translate' : 'rotate');
    setupTransformControlsEnability(controls,
      document.getElementById(key + 'Checkbox').checked,
      deviceCapabilities[key === 'headset' ? key : 'controller']);
  }

  document.getElementById('translateButton').textContent =
    states.translateMode ? 'Translate' : 'Rotate';

  render();
};

document.getElementById('translateButton').addEventListener('click', event => {
  toggleTranslateMode();
}, false);

document.getElementById('rightPressButton').addEventListener('click', event => {
  states.rightButtonPressed = !states.rightButtonPressed;
  notifyInputButtonPressed('rightHand', states.rightButtonPressed);
  updateTriggerButtonColor('rightHand', states.rightButtonPressed);
  updateControllerColor(assetNodes.rightHand, states.rightButtonPressed);
}, false);

document.getElementById('leftPressButton').addEventListener('click', event => {
  states.leftButtonPressed = !states.leftButtonPressed;
  notifyInputButtonPressed('leftHand', states.leftButtonPressed);
  updateTriggerButtonColor('leftHand', states.leftButtonPressed);
  updateControllerColor(assetNodes.leftHand, states.leftButtonPressed);
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
  updateControllerPropertyComponent('rightHand');
  updateControllerPropertyComponent('leftHand');

  notifyPoses();
  render();
}, false);

document.getElementById('exitButton').addEventListener('click', event => {
  notifyExitImmersive();
}, false);

// setup configurations and start
// 1. load external devices.json file
// 2. set up dom elements from it
// 3. load configuration from storage and load assets

ConfigurationManager.createFromJsonFile('./devices.json').then(manager => {
  const deviceSelect = document.getElementById('deviceSelect');
  const stereoCheckbox = document.getElementById('stereoCheckbox');

  // set up devices select element

  const devices = manager.devices;
  const deviceKeys = Object.keys(devices);
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


// copy values to clipboard on click
const onTransformFieldClick = event => {
  let el= event.target;
  navigator.clipboard.writeText(el.innerHTML.split(' ').join(', '))
}

const setupTransformFields = () => {
  let fields = document.getElementsByClassName('value');
  for (var i = 0; i < fields.length; i++) {
    fields[i].addEventListener('click', onTransformFieldClick);
    fields[i].title = 'Click to copy to clipboard';
  }
}
setupTransformFields();
