document.getElementById('connectButton').addEventListener('click', event => {
  navigator.mediaDevices.getUserMedia({video: true}).then(stream => {
    window.close();
  }).catch(error => {
    // @TODO: More proper error handling
    console.error(error);
  });
});
