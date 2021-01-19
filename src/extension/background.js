const connections = {};

chrome.runtime.onConnect.addListener(port => {
  // @TODO: release connection when disconnected

  port.onMessage.addListener((message, sender, reply) => {
    const tabId = message.tabId !== undefined ? message.tabId : sender.sender.tab.id;

    if (connections[tabId] === undefined) {
      connections[tabId] = {};
    }

    const portMap = connections[tabId];

    portMap[port.name] = port;

    // Special path for Web Camera connection request

    if (message.action === 'webcam-connection-request' && port.name === 'panel') {
      requestWebCamConnection(portMap.panel);
      return;
    }

    // transfer message between panel and contentScript of the same tab

    if (port.name === 'panel') {
      if (portMap.contentScript) {
        portMap.contentScript.postMessage(message);
      }
    }
    if (port.name === 'contentScript') {
      if (portMap.panel) {
        portMap.panel.postMessage(message);
      }
    }
  });
});

const debugHelper = new MediaPipeDebugHelper();
const mpHelper = new MediaPipeHelper();
mpHelper.addOnFrameListener((poses, results) => {
  if (poses.left || poses.right) {
    for (const key in connections) {
      const port = connections[key];
      if (!port.panel) { continue; }
      port.panel.postMessage({
        action: 'hand-pose',
        poses: poses
      });
    }
  }
  debugHelper.update(results);
});

const webCamHelper = new WebCamHelper();
webCamHelper.addOnFrameListener(video => {
  return mpHelper.send(video);
});

const requestWebCamConnection = async panel => {
  if (await webCamHelper.requestConnection()) {
    panel.postMessage({
      action: 'webcam-connected',
      connected: true
    });
    await debugHelper.init();
    return true;
  } else {
    panel.postMessage({
      action: 'webcam-connected',
      connected: false
    });
    return false;
  };
};
