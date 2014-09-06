var Promise = require('es6-promise').Promise;
var flickr = require('./flickr');
var photosTemplate = require('./views/photos.hbs');
var utils = require('./utils');

// force https
if ((!location.port || location.port == "80") && location.protocol != 'https:') {
  location.protocol = 'https:';
}

var photosEl = document.querySelector('.photos');
var refreshButton = document.querySelector('button.refresh');
var msgEl = document.querySelector('.msg-container');
var msgContentEl = document.querySelector('.msg');
var photoIDsDisplayed = null;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/trained-to-thrill/static/js/sw.js', {
    scope: '/trained-to-thrill/'
  }).then(function(reg) {
    console.log('◕‿◕', reg);
  }, function(err) {
    console.log('ಠ_ಠ', err);
  });
}

function showSpinner(data) {
  refreshButton.classList.add('loading');
}

function hideSpinner(data) {
  refreshButton.classList.remove('loading');
}

function updatePage(data) {
  var scrollHeight;
  
  
  if (photoIDsDisplayed) {
    scrollHeight = photosEl.scrollHeight;

    data = data.filter(function(photo) {
      if (photoIDsDisplayed.indexOf(photo.id) == -1) {
        photoIDsDisplayed.push(photo.id);
        return true;
      }
      return false;
    });

    photosEl.insertBefore(utils.strToEls(photosTemplate(data)), photosEl.firstChild);
    photosEl.scrollTop += photosEl.scrollHeight - scrollHeight;
  }
  else {
    photoIDsDisplayed = data.map(function(p) { return p.id; });
    photosEl.insertBefore(utils.strToEls(photosTemplate(data)), photosEl.firstChild);
  }
}

function getTrainPhotoData() {
  return flickr.search('train station', {
    headers: {}
  });
}

function getCachedTrainPhotoData() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return flickr.search('train station', {
      headers: {'Accept': 'x-cache/only'}
    });
  }
  else {
    return Promise.reject(Error("No controller"));
  }
}

function showMessage(msg, duration) {
  msgContentEl.textContent = msg;
  msgEl.style.display = 'block';
  msgEl.offsetWidth;
  msgEl.classList.add('show');
  setTimeout(function() {
    msgEl.classList.remove('show');
  }, duration);
}

function showConnectionError() {
  showMessage("Connectivity derailed!", 5000);
}

// Refresh button
refreshButton.addEventListener('click', function(event) {
  this.blur();
  event.preventDefault();
  showSpinner();
  getTrainPhotoData().then(function(data) {
    var oldLen = photoIDsDisplayed && photoIDsDisplayed.length;
    updatePage(data);
    if (oldLen != photoIDsDisplayed.length) {
      photosEl.scrollTop = 0;
    }
  }).catch(showConnectionError).then(hideSpinner);
});

// Initial load

var liveDataPromise = getTrainPhotoData().then(function(data) {
  var alreadyRendered = !!photoIDsDisplayed;
  var oldLen = photoIDsDisplayed && photoIDsDisplayed.length;
  updatePage(data);
  if (alreadyRendered && oldLen != photoIDsDisplayed.length) {
    showMessage("▲ New trains ▲", 3000);
  }
});

var cachedDataPromise = getCachedTrainPhotoData().then(function(data) {
  if (!photoIDsDisplayed) {
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