var utils = require('./utils');

var apiKey = 'f2cca7d09b75c6cdea6864aca72e9895';
var apiUrl = 'https://api.flickr.com/services/rest/';

function search(text, opts) {
  var params = {
    method: 'flickr.photos.search',
    extras: 'description',
    format: 'json',
    api_key: apiKey,
    text: text,
    license: '4,5,6,7',
    content_type: 1,
    nojsoncallback: 1,
    per_page: 10
  };

  return utils.request(apiUrl + '?' + utils.toQuerystring(params), opts).then(JSON.parse).then(function(response) {
    if (response.stat == 'fail') {
      throw Error(response.err.msg);
    }

    return response.photos.photo.sort(function(a, b) {
      return b.id - a.id;
    }).map(function(photo) {
      return {
        id: photo.id,
        title: photo.title,
        flickrUrl: 'https://www.flickr.com/photos/' + photo.owner + '/' + photo.id + '/',
        imgUrl: 'https://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '_c.jpg',
        description: photo.description._content.trim()
      };
    });
  });
}

module.exports.search = search;