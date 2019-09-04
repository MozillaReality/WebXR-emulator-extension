const port = chrome.runtime.connect(null, {name: 'devtools'});

chrome.devtools.panels.create(
  "WebXR",
  "icon128.png",
  "panel.html"
);