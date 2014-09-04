var caches = require('../libs/caches');

self.oninstall = function(event) {
  event.waitUntil(Promise.all([
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
    }),
    caches.get('trains-imgs').then(function(cache) {
      return cache || caches.create('trains-imgs');
    }),
    caches.get('trains-data').then(function(cache) {
      return cache || caches.create('trains-data');
    })
  ]));
};

self.onfetch = function(event) {
  var requestURL = new URL(event.request.url);

  if (requestURL.hostname == 'api.flickr.com') {
    event.respondWith(flickrAPIResponse(event.request));
  }
  else if (/\.staticflickr\.com$/.test(requestURL.hostname)) {
    event.respondWith(flickrImageResponse(event.request));
  }
  else {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        if (response) {
          return response;
        }
        throw Error("No response");
      })
    );
  }
};

function flickrAPIResponse(request) {
  if (request.headers.get('Accept') == 'x-cache/only') {
    return caches.match(request).then(function(response) {
      if (response) {
        return response;
      }
      throw Error("No response");
    });
  }
  else {
    return fetch(request.url).then(function(response) {
      return caches.delete('content').then(function() {
        return caches.create('content');
      }).then(function(cache) {
        cache.put(request, response);
        return response;
      });
    });
  }
}

function flickrImageResponse(request) {
  return caches.match(request).then(function(response) {
    if (response) {
      return response;
    }

    return fetch(request.url).then(function(response) {
      caches.get('trains-imgs').then(function(cache) {
        cache.put(request, response);
      });

      return response;
    });
  });
}
