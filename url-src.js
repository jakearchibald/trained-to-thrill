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

var Stream = require('stream').Readable;
var File = require('vinyl');
var http = require('http');

module.exports = function(root, paths) {
  var pathIndex = -1;
  var stream = new Stream({
    objectMode: true
  });

  stream._read = function() {
    pathIndex++;

    var path = paths[pathIndex];

    if (pathIndex >= paths.length) {
      stream.push(null);
      return;
    }

    http.get(root + path, function(res) {
      var filePath = path;
      if (!filePath || filePath.slice(-1) == '/') {
        filePath += 'index.html';
      }

      stream.push(new File({
        path: filePath,
        contents: res
      }));
    });
  };

  return stream;
};
