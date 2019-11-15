const port = chrome.runtime.connect(null, {name: 'devtools'});

chrome.devtools.panels.create(
  "WebXR",
  "/icons/icon128.png",
  "/src/app/panel.html"
);