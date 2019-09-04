const port = chrome.runtime.connect(null, {name: 'devtools'});

chrome.devtools.panels.create(
  "WebXR",
  "icon16.png",
  "panel.html"
);