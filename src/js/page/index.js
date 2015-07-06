/**
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

window.Promise = window.Promise || require('es6-promise').Promise;
require('whatwg-fetch');

var flickr = require('./flickr');
var photosTemplate = require('./views/photos.hbs');
var utils = require('./utils');
var searchTerm = 'train station';

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
  navigator.serviceWorker.register('./sw.js');

  // Warm up the cache on that very first use
  if (!navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', function changeListener() {
      // New worker has claimed, warm up the caches
      flickr.search(searchTerm, {
        headers: {'x-cache-warmup': '1'}
      });

      // We only care about this once.
      navigator.serviceWorker.removeEventListener('controllerchange', changeListener);
    });
  }
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
  return flickr.search(searchTerm, {
    headers: {}
  }).catch(function() {
    return null;
  });
}

function getCachedTrainPhotoData() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return flickr.search(searchTerm, {
      headers: {'x-use-cache-only': '1'}
    }).catch(function() {
      return null;
    });
  }
  else {
    return Promise.resolve(null);
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

var liveDataFetched = getTrainPhotoData().then(function(data) {
  if (!data) return false;

  var alreadyRendered = !!photoIDsDisplayed;
  var oldLen = photoIDsDisplayed && photoIDsDisplayed.length;
  updatePage(data);
  if (alreadyRendered && oldLen != photoIDsDisplayed.length) {
    showMessage("▲ New trains ▲", 3000);
  }
  return true;
});

var cachedDataFetched = getCachedTrainPhotoData().then(function(data) {
  if (!data) return false;
  if (!photoIDsDisplayed) {
    updatePage(data);
  }
  return true;
});

liveDataFetched.then(function(fetched) {
  return fetched || cachedDataFetched;
}).then(function(dataFetched) {
  if (!dataFetched) {
    showConnectionError();
  }
  hideSpinner();
});

// Add classes to fade-in images
document.addEventListener('load', function(event) {
  if (event.target.classList.contains('main-photo-img')) {
    event.target.parentNode.classList.add('loaded');
  }
}, true);
