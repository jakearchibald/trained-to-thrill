/**
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

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

  return fetch(apiUrl + '?' + utils.toQuerystring(params), opts).then(function(response) {
    return response.json();
  }).then(function(response) {
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
