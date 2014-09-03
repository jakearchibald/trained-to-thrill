var caches = require('../libs/caches');

self.oninstall = function(event) {
  event.waitUntil(
    caches.get('static-v1').then(function(cache) {
      return cache || caches.create('static-v1');
    }).then(function(cache) {
      return cache.addAll([
        '/trained-to-thrill/',
        '/trained-to-thrill/static/css/all.css',
        '/trained-to-thrill/static/js/page.js',
        '/trained-to-thrill/static/imgs/logo.svg',
        '/trained-to-thrill/static/imgs/icon.png'
      ]);
    })
  );
};

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

/*
this.onfetch = function(event) {
  var requestURL = new URL(event.request.url);

  if (requestURL.hostname == 'api.flickr.com') {
    event.respondWith(flickrAPIResponse(event.request));
  }
  else if (/\.staticflickr\.com$/.test(requestURL.hostname)) {
    event.respondWith(flickrImageResponse(event.request));
  }
  else {
    event.respondWith(
      caches.match(event.request).catch(function() {
        return event.default();
      })
    );
  }
};

function flickrAPIResponse(request) {
  if (request.headers.has('x-use-cache')) {
    return caches.match(request);
  }
  else {
    return caches.delete('content').then(function() {
      return caches.create('content');
    }).then(function(cache) {
      cache.add(request);
      return fetch(request);
    });
  }
}

function flickrImageResponse(request) {
  return caches.match(request).catch(function() {
    return caches.get('content').then(function(cache) {
      cache.add(request);
      return fetch(request);
    });
  });
}
*/