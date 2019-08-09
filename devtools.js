const port = chrome.runtime.connect(null, {name: 'devtools'});

chrome.devtools.panels.create(
  "WebXR",
  "",
  "panel.html"
);