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
  return IDBHelper.iterate(
    tx.objectStore('cacheNames').openCursor(),
    callback
  );
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

  var cacheEntries = tx.objectStore('cacheEntries');
  var range;
  var index;
  var indexName = 'cacheName-url';
  var urlToMatch = new URL(request.url);

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

  return IDBHelper.iterate(index.openCursor(range), function(cursor) {
    var value = cursor.value;
    
    if (ignoreVary || matchesVary(request, cursor.value)) {
      callback(cursor);
    }
    else {
      cursor.continue();
    }
  });
};

CacheDBProto._hasCache = function(tx, cacheName) {
  var index = tx.objectStore.cacheNames.index('cacheName');
  return IDBHelper.promisify(index.get(cacheName)).then(function(val) {
    return !!val;
  });
};

CacheDBProto.matchAll = function(cacheName, request, params) {
  var matches = [];
  return this.db.transaction('cacheEntries', function(tx) {
    this._eachMatch(tx, cacheName, request, function(cursor) {
      matches.push(cursor.value);
      cursor.continue();
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
        // we're done
      }, params);

      if (!match) { // continue if no match
        cursor.continue();
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
  var returnVal;
  return this.db.transaction('cacheNames', function(tx) {
    returnVal = this._hasCache(tx, cacheName);
  }.bind(this)).then(function(val) {
    return returnVal;
  });
};

CacheDBProto.deleteCache = function(cacheName) {
  var returnVal = false;

  return this.db.transaction(['cacheEntries', 'cacheNames'], function(tx) {
    IDBHelper.iterate(
      tx.objectStore.cacheNames.index('cacheName').get(cacheName).openCursor(),
      del
    );

    IDBHelper.iterate(
      tx.objectStore.cacheEntries.index('cacheName').get(cacheName).openCursor(),
      del
    );

    function del(cursor) {
      returnVal = true;
      cursor.delete();
      cursor.continue();
    }
  }.bind(this), {mode: 'readWrite'}).then(function() {
    return returnVal;
  });
};

CacheDBProto.put = function(cacheName, items) {
  var returnVal;
  // items is [[request, response], [request, response], …]
  return this.db.transaction(['cacheEntries', 'cacheNames'], function(tx) {
    returnVal = this._hasCache(tx, cacheName).then(function(hasCache) {
      if (!hasCache) {
        throw Error("Cache of that name does not exist");
      }
    }).then(function() {
      
    });
  }.bind(this), {mode: 'readWrite'}).then(function() {
    return returnVal;
  });
};


module.exports = new CacheDB();