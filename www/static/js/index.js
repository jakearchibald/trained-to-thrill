var flickrSearch = require('./flickr').search;
var PhotosView = require('./views/photos');

document.addEventListener('load', function(event) {
  if (event.target.classList.contains('main-photo-img')) {
    event.target.parentNode.classList.add('loaded');
  }
}, true);

flickrSearch('train station').then(function(response) {
  document.querySelector('.photos').appendChild(new PhotosView(response).el);
}).catch(function(err) {
  console.log('noooope');
  console.error(err);
});