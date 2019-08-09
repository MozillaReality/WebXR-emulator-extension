const connections = {};

chrome.runtime.onConnect.addListener(port => {
  // @TODO: manage tabs

  connections[port.name] = port;

  port.onMessage.addListener((message, sender, reply) => {
    if (port.name === 'panel') {
      if (connections.contentScript) {
        connections.contentScript.postMessage(message);
      }
    }
    if (port.name === 'contentScript') {
      if (connections.panel) {
        connections.panel.postMessage(message);
      }
    }
  });
});