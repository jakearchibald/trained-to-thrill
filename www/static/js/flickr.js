var request = require('./utils').request;
var querystring = require('querystring');
var apiKey = 'f2cca7d09b75c6cdea6864aca72e9895';
var apiUrl = 'https://api.flickr.com/services/rest/';

function search(text, opts) {
  var params = {
    method: 'flickr.photos.search',
    format: 'json',
    api_key: apiKey,
    text: text,
    license: '4,5,6,7',
    content_type: 1,
    nojsoncallback: 1,
    per_page: 10
  };

  return request(apiUrl + '?' + querystring.stringify(params), opts).then(JSON.parse).then(function(response) {
    if (response.stat == 'fail') {
      throw Error(response.err.msg);
    }

    return response.photos.photo.map(function(photo) {
      return {
        title: photo.title,
        flickrUrl: 'https://www.flickr.com/photos/' + photo.owner + '/' + photo.id + '/',
        imgUrl: 'http://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '_c.jpg'
      };
    });
  });
}

exports.search = search;