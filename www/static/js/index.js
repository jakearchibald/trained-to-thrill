var flickrSearch = require('./flickr').search;
var PhotosView = require('./views/photos');

flickrSearch('train station').then(function(response) {
  document.querySelector('.photos').appendChild(new PhotosView(response).el);
}).catch(function(err) {
  console.log('noooope');
  console.error(err);
});