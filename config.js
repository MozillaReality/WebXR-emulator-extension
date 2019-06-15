const configurationId = 'webxr-extension';
const initialValues = '0';
const deviceSelect = document.getElementById('deviceSelect');

browser.storage.local.get(configurationId).then(result => {
  const values = (result[configurationId] || initialValues).split(':');
  deviceSelect.selectedIndex = parseInt(values[0]);
});

deviceSelect.addEventListener('change', event => {
  const storedValue = {};
  storedValue[configurationId] = [ deviceSelect.selectedIndex ].join(':');
  browser.storage.local.set(storedValue).then(() => {
  });
});
