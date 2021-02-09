const connections = {};

chrome.runtime.onConnect.addListener(port => {
  port.onMessage.addListener((message, sender, reply) => {
    const tabId = message.tabId !== undefined ? message.tabId : sender.sender.tab.id;

    if (connections[tabId] === undefined) {
      connections[tabId] = {};
    }

    const portMap = connections[tabId];

    // Can be multiple content scripts per tab
    // for example if a web page includes iframe.
    // So manage ports as an array.
    if (!portMap[port.name]) {
      portMap[port.name] = [];
    }

    if (!portMap[port.name].includes(port)) {
      portMap[port.name].push(port);
      port.onDisconnect.addListener(() => {
        if (portMap[port.name].includes(port)) {
          portMap[port.name].splice(portMap[port.name].indexOf(port), 1);
        }
        if (portMap[port.name].length === 0) {
          delete portMap[port.name]
        }
        if (Object.keys(portMap).length === 0) {
          delete connections[tabId];
        }
      });
    }

    // Special path for Web Camera connection request

    if (port.name === 'panel' &&
      (message.action === 'webcam-request' ||
      message.action === 'pip-request')) {
      handleWebCamOrPip(message);
      return;
    }

    // transfer message between panel and contentScript of the same tab

    if (port.name === 'panel') {
      postMessageToPorts(portMap.contentScript, message);
    }
    if (port.name === 'contentScript') {
      postMessageToPorts(portMap.panel, message);
    }
  });

  // Notify the WebCam and PIP status to the panel
  // when it opens.
  if (port.name === 'panel') {
    notifyWebCamAndPipStatus(port);
  }
});

const postMessageToPorts = (ports, message) => {
  ports && ports.forEach(port => {
    port.postMessage(message);
  });
};

const postMessageToAllPanels = message => {
  for (const key in connections) {
    const port = connections[key];
    postMessageToPorts(port.panel, message);
  }
};

// For Hand input support with MediaPipe

const doHorizontallyFlip = true;
const debugHelper = new MediaPipeDebugHelper(doHorizontallyFlip);
const mpHelper = new MediaPipeHelper(doHorizontallyFlip);
mpHelper.addOnFrameListener((poses, results) => {
  if (poses.left || poses.right) {
    postMessageToAllPanels({
      action: 'hand-pose',
      poses: poses
    });
  }
  debugHelper.update(results);
});
debugHelper.addOnLeaveListener(() => {
  postMessageToAllPanels({
    action: 'pip-status',
    active: false
  });
});

const webCamHelper = new WebCamHelper();
webCamHelper.addOnFrameListener(video => {
  return mpHelper.send(video);
});

const notifyWebCamAndPipStatus = port => {
  port.postMessage({
    action: 'webcam-status',
    active: !webCamHelper.paused
  });
  port.postMessage({
    action: 'pip-status',
    active: !debugHelper.paused
  });
};

const handleWebCamOrPip = message => {
  if (message.action === 'webcam-request') {
    if (message.activate) {
      startWebCam();
    } else {
      stopWebCam();
    }
    return;
  }
  if (message.action === 'pip-request') {
    if (message.activate) {
      requestPictureInPicture();
    } else {
      stopPictureInPicture();
    }
    return;
  }
};

const startWebCam = async () => {
  if (!webCamHelper.initialized) {
    if (!(await webCamHelper.init())) {
      chrome.runtime.openOptionsPage();
      postMessageToAllPanels({
        action: 'webcam-status',
        active: false
      });
      return false;
    }
    mpHelper.init();
  }
  const succeeded = await webCamHelper.play();
  postMessageToAllPanels({
    action: 'webcam-status',
    active: succeeded
  });
  return succeeded;
};

const stopWebCam = async () => {
  const paused = await webCamHelper.pause();
  postMessageToAllPanels({
    action: 'webcam-status',
    active: !paused
  });
  if (!debugHelper.paused) {
    // @TODO: Error handling
    if (await debugHelper.pause()) {
      postMessageToAllPanels({
        action: 'pip-status',
        active: false
      });
    }
  }
  return paused;
};

const requestPictureInPicture = async () => {
  if (!debugHelper.initialized) {
    if (!(await debugHelper.init())) {
      postMessageToAllPanels({
        action: 'pip-status',
        active: false
      });
      return false;
    }
  }
  const succeeded = await debugHelper.play();
  postMessageToAllPanels({
    action: 'pip-status',
    active: succeeded
  });
  if (!succeeded) {
    // requestPictureInPicture() invoked in MediaPipeDebugHelper.play()
    // sometimes causes an "needs user gesture to be initiated" exception.
    // Retry often would work in such the case.
    window.alert('An error has happened. Press "Start PIP" button again.');
  }
  return succeeded;
};

const stopPictureInPicture = async () => {
  const paused = await debugHelper.pause();
  postMessageToAllPanels({
    action: 'pip-status',
    active: !paused
  });
  return paused;
};
