this.oninstall = function(event) {
  var staticCache = new Cache();

  event.waitUntil(Promise.all([
    caches.add('static-v1', staticCache),
    staticCache.add(
      '/trained-to-thrill/',
      '/trained-to-thrill/static/css/all.css',
      '/trained-to-thrill/static/js/es6-promise.js',
      '/trained-to-thrill/static/js/utils.js',
      '/trained-to-thrill/static/js/flickr.js',
      '/trained-to-thrill/static/js/photos-template.js',
      '/trained-to-thrill/static/js/app.js',
      '/trained-to-thrill/static/js/sw.js',
      '/trained-to-thrill/static/imgs/logo.svg',
      '/trained-to-thrill/static/imgs/icon.png'
    )
  ]));
};

this.onfetch = function(event) {
  var requestURL = new URL(event.request.url);

  if (requestURL.hostname == 'api.flickr.com') {
    event.respondWith(flickrAPIResponse(event.request));
  }
  else if (/\.staticflickr\.com$/.test(requestURL.hostname)) {
    event.respondWith(flickrImageResponse(event.request));
  }
  else {
    respondWith(
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
    var contentCache = new Cache();
    caches.add('content', contentCache);
    contentCache.add(request);
    return fetch(request);
  }
}

function flickrImageResponse(request) {
  return caches.match(request).catch(function() {
    caches.get('content').then(function() {
      cache.add(request);
    });
    return fetch(request);
  });
}