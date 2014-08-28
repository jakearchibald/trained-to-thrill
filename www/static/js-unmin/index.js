var Promise = require('es6-promise').Promise;
var flickr = require('./flickr');
var photosTemplate = require('./views/photos.hbs');

// force https
if ((!location.port || location.port == "80") && location.protocol != 'https:') {
  location.protocol = 'https:';
}

var photosEl = document.querySelector('.photos');
var refreshButton = document.querySelector('button.refresh');
var errorEl = document.querySelector('.error-container');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/trained-to-thrill/static/js/sw.js', {
    scope: '/trained-to-thrill/'
  });
}

function showSpinner(data) {
  refreshButton.classList.add('loading');
}

function hideSpinner(data) {
  refreshButton.classList.remove('loading');
}

function updatePage(data) {
  photosEl.innerHTML = photosTemplate(data);
}

function getTrainPhotoData() {
  return flickr.search('rail', {
    headers: {}
  });
}

function getCachedTrainPhotoData() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.current) {
    return flickr.search('rail', {
      headers: {'x-use-cache': 'true'}
    });
  }
  else {
    return Promise.reject(Error("No current serviceWorker"));
  }
}

function showConnectionError() {
  errorEl.style.display = 'block';
  errorEl.offsetWidth;
  errorEl.classList.add('show');
  setTimeout(function() {
    errorEl.classList.remove('show');
  }, 5000);
}

// Refresh button
refreshButton.addEventListener('click', function(event) {
  this.blur();
  event.preventDefault();
  showSpinner();
  getTrainPhotoData().then(updatePage).catch(showConnectionError).then(hideSpinner);
});

// Initial load
var showingLiveData = false;

var liveDataPromise = getTrainPhotoData().then(updatePage).then(function() {
  showingLiveData = true;
});

var cachedDataPromise = getCachedTrainPhotoData().then(function(data) {
  if (!showingLiveData) {
    updatePage(data);
  }
});

liveDataPromise.catch(function() {
  return cachedDataPromise;
}).catch(showConnectionError).then(hideSpinner);

// Add classes to fade-in images
document.addEventListener('load', function(event) {
  if (event.target.classList.contains('main-photo-img')) {
    event.target.parentNode.classList.add('loaded');
  }
}, true);