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