var IDBHelper = require('./idbhelper');

function castToRequest(request) {
  if (!(request instanceof Request)) {
    request = new Request(request);
  }
  return request;
}

function matchesVary(request, entry) {
  var entryRequest = entry.request;
  var entryResponse = entry.response;

  if (!entryResponse.headers.vary) {
    return true;
  }

  var varyHeaders = entryResponse.headers.vary.split(',');
  var varyHeader;

  for (var j = 0; j < varyHeaders.length; j++) {
    varyHeader = varyHeaders[j].trim();

    if (varyHeader == '*') {
      continue;
    }

    if (entryRequest.headers[varyHeader] != request.headers.get(varyHeader)) {
      return false;
    }
  }
  return true;
}

function entryToResponse(entry) {
  var entryResponse = entry.response;
  return new Response(entryResponse.blob, {
    status: entryResponse.status,
    statusText: entryResponse.statusText,
    headers: entryResponse.headers
  });
}

function CacheDB() {
  this.db = new IDBHelper('cache-polyfill', 1, function(db, oldVersion) {
    switch (oldVersion) {
      case 0:
        var namesStore = db.createObjectStore('cacheNames', {autoIncrement: true});
        namesStore.createIndex('cacheName', '', {unique: true});

        var entryStore = db.createObjectStore('cacheEntries', {
          keyPath: ['cacheName', 'request.url', 'varyID']
        });
        entryStore.createIndex('cacheName', 'cacheName');
        entryStore.createIndex('cacheName-urlNoSearch', ['cacheName', 'requestUrlNoSearch']);
        entryStore.createIndex('cacheName-url', ['cacheName', 'request.url']);
    }
  });
}

var CacheDBProto = CacheDB.prototype;

CacheDBProto._eachCacheName = function(tx, callback) {
  return new Promise(function(resolve, reject) {
    var cursorRequest = tx.objectStore('cacheNames').openCursor();
    cursorRequest.onsuccess = function() {
      var cursor = cursorRequest.result;

      if (!cursor) {
        resolve();
        return;
      }

      if (callback(cursor)) {
        cursor.continue();
      }
      else {
        resolve();
        return;
      }
    };

    cursorRequest.onerror = function() {
      reject(cursorRequest.error);
    };
  });
};

CacheDBProto._eachMatch = function(tx, cacheName, request, callback, params) {
  var ignoreSearch = Boolean(params.ignoreSearch);
  var ignoreMethod = Boolean(params.ignoreMethod);
  var ignoreVary = Boolean(params.ignoreVary);
  var prefixMatch = Boolean(params.prefixMatch);

  request = castToRequest(request);

  if (!ignoreMethod &&
      request.method !== 'GET' &&
      request.method !== 'HEAD') {
    // we only store GET responses at the moment, so no match
    return Promise.resolve();
  }

  return new Promise(function(resolve, reject) {
    var cacheEntries = tx.objectStore('cacheEntries');
    var range;
    var index;
    var indexName = 'cacheName-url';
    var urlToMatch = new URL(request.url);
    var cursorRequest;

    urlToMatch.hash = '';

    if (ignoreSearch) {
      urlToMatch.search = '';
      indexName += 'NoSearch';
    }

    index = cacheEntries.index(indexName);

    if (prefixMatch) {
      range = IDBKeyRange.bound([cacheName, urlToMatch], [cacheName, urlToMatch + String.fromCharCode(65535)]);
    }
    else {
      range = IDBKeyRange.only([cacheName, urlToMatch]);
    }

    cursorRequest = index.openCursor(range);

    cursorRequest.onsuccess = function() {
      var cursor = cursorRequest.result;

      if (!cursor) {
        resolve();
        return;
      }

      var value = cursor.value;

      if (ignoreVary || matchesVary(request, cursor.value)) {
        if (callback(cursor)) {
          cursor.continue();
        }
        else {
          resolve();
          return;
        }
      }
      else {
        cursor.continue();
      }
    };

    cursorRequest.onerror = function() {
      reject(cursorRequest.error);
    };
  });
};

CacheDBProto.matchAll = function(cacheName, request, params) {
  var matches = [];
  return this.db.transaction('cacheEntries', function(tx) {
    this._eachMatch(tx, cacheName, request, function(cursor) {
      matches.push(cursor.value);
      return true;
    }, params);
  }.bind(this)).then(function() {
    return matches.map(entryToResponse);
  });
};

CacheDBProto.match = function(cacheName, request, params) {
  var match;
  return this.db.transaction('cacheEntries', function(tx) {
    this._eachMatch(tx, cacheName, request, function(cursor) {
      match = cursor.value;
      return false;
    }, params);
  }.bind(this)).then(function() {
    return entryToResponse(match);
  });
};

CacheDBProto.matchAcrossCaches = function(request, params) {
  var match;

  return this.db.transaction(['cacheEntries', 'cacheNames'], function(tx) {
    this._eachCacheName(tx, function(cursor) {
      var cacheName = cursor.value;
      this._eachMatch(tx, cacheName, request, function(cursor) {
        match = cursor.value;
        return false; // we're done
      }, params);

      if (!match) { // continue if no match
        return true;
      }
    }.bind(this));
  }.bind(this)).then(function() {
    return entryToResponse(match);
  });
};

CacheDBProto.delete = function(cacheName, request, params) {
  var returnVal = false;

  return this.db.transaction('cacheEntries', function(tx) {
    this._eachMatch(tx, cacheName, request, function(cursor) {
      returnVal = true;
      cursor.delete();
    }, params);
  }.bind(this), {mode: 'readWrite'}).then(function() {
    return returnVal;
  });
};

CacheDBProto.createCache = function(cacheName) {
  return this.db.transaction('cacheNames', function(tx) {
    var store = tx.objectStore.cacheNames;
    store.add(cacheName);
  }.bind(this), {mode: 'readWrite'});
};

CacheDBProto.hasCache = function(cacheName) {
  return this.db.transaction('cacheNames', function(tx) {
    var index = tx.objectStore.cacheNames.index('cacheName');
    return index.get(cacheName);
  }.bind(this)).then(function(val) {
    return !!val;
  });
};

CacheDBProto.deleteCache = function(cacheName) {
  var returnVal = false;

  return this.db.transaction(['cacheEntries', 'cacheNames'], function(tx) {
    tx.objectStore.cacheNames.index('cacheName')
      .get(cacheName).openCursor().onsuccess = del;

    tx.objectStore.cacheEntries.index('cacheName')
      .get(cacheName).openCursor().onsuccess = del;

    function del() {
      returnVal = true;
      var cursor = this.result;

      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    }
  }.bind(this), {mode: 'readWrite'}).then(function() {
    return returnVal;
  });
};

CacheDBProto.put = function(cacheName, items) {
  // items is [[request, response], [request, response], …]
  return this.db.transaction(['cacheEntries', 'cacheNames'], function(tx) {
    // TODO: you are here
  }.bind(this), {mode: 'readWrite'});
};


module.exports = new CacheDB();