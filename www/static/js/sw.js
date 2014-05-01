this.oninstall = function(event) {
  var staticCache = new Cache();

  event.waitUntil(Promise.all([
    caches.add('static-v1', staticCache),
    staticCache.add(
      '/trained-to-thrill/',
      '/trained-to-thrill/static/js/all.js',
      '/trained-to-thrill/static/css/all.css',
      '/trained-to-thrill/static/imgs/logo.svg'
    )
  ]));
};