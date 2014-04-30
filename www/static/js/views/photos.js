var photosTemplate = require('./templates/photos.hbs');

function Photos(photos) {
  var thisPhotos = this;

  this.el = document.createElement('div');

  this.el.innerHTML = photosTemplate(photos);
}

module.exports = Photos;