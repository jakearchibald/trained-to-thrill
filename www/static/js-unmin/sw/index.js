var caches = require('../libs/caches');

function splitResponse(response) {
  return response.blob().then(function(blob) {
    return [0,0].map(function() {
      return new Response(blob, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    });
  });
}

self.oninstall = function(event) {
  event.waitUntil(Promise.all([
    caches.get('trains-static-v7').then(function(cache) {
      return cache || caches.create('trains-static-v7');
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

var expectedCaches = [
  'trains-static-v7',
  'trains-imgs',
  'trains-data'
];

self.onactivate = function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (!/^trains-/.test(cacheName)) {
            return;
          }
          if (expectedCaches.indexOf(cacheName) == -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
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
      caches.match(event.request, {
        ignoreVary: true
      }).then(function(response) {
        if (response) {
          return response;
        }
        return new Response("No response");
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
      return new Response("No response");
    });
  }
  else {
    return fetch(request.url).then(function(response) {
      return caches.get('trains-data').then(function(cache) {
        // clean up the image cache
        splitResponse(response).then(function(responses) {
          Promise.all([
            responses[0].json(),
            caches.get('trains-imgs')
          ]).then(function(results) {
            var data = results[0];
            var imgCache = results[1];

            var imgURLs = data.photos.photo.map(function(photo) {
              return 'https://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '_c.jpg';
            });

            imgCache.keys().then(function(requests) {
              requests.forEach(function(request) {
                if (imgURLs.indexOf(request.url) == -1) {
                  imgCache.delete(request);
                }
              });
            });
          });

          cache.put(request, responses[1]).then(function() {
            console.log("Yey cache");
          }, function() {
            console.log("Nay cache");
          });
        });

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
        cache.put(request, response).then(function() {
          console.log('yey img cache');
        }, function() {
          console.log('nay img cache');
        });
      });

      return response;
    });
  });
}
