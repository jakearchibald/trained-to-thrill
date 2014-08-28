function promisifyRequest(obj) {
  return new Promise(function(resolve, reject) {
    function onsuccess(event) {
      resolve(obj.result);
      unlisten();
    }
    function onerror(event) {
      reject(obj.error);
      unlisten();
    }
    function unlisten() {
      obj.removeEventListener('complete', onsuccess);
      obj.removeEventListener('success', onsuccess);
      obj.removeEventListener('error', onerror);
      obj.removeEventListener('abort', onerror);
    }
    obj.addEventListener('complete', onsuccess);
    obj.addEventListener('success', onsuccess);
    obj.addEventListener('error', onerror);
    obj.addEventListener('abort', onerror);
  });
}

function IDBHelper(name, version, upgradeCallback) {
  var request = indexedDB.open(name, version);
  this.ready = promisifyRequest(request);
  request.onupgradeneeded = function(event) {
    upgradeCallback(request.result, event.oldVersion);
  };
}

IDBHelper.supported = 'indexedDB' in self;

var IDBHelperProto = IDBHelper.prototype;

IDBHelperProto.transaction = function(stores, callback, opts) {
  opts = opts || {};

  return this.ready.then(function(db) {
    var mode = opts.mode || 'readonly';

    var tx = db.transaction(stores, mode);
    var val = callback(tx, db);
    var promise = promisifyRequest(tx);
    var readPromise;

    if (!val) {
      return promise;
    }

    if (val[0] && 'result' in val[0]) {
      readPromise = Promise.all(val.map(promisifyRequest));
    }
    else {
      readPromise = promisifyRequest(val);
    }

    return promise.then(function() {
      return readPromise;
    });
  });
};

IDBHelperProto.get = function(store, key) {
  return this.transaction(store, function(tx) {
    return tx.objectStore(store).get(key);
  });
};

IDBHelperProto.put = function(store, key, value) {
  return this.transaction(store, function(tx) {
    tx.objectStore(store).put(value, key);
  }, {
    mode: 'readwrite'
  });
};

IDBHelperProto.each = function(storeName, callback, opts) {
  opts = opts || {};

  return new Promise(function(resolve, reject) {
    this.transaction(storeName, function(tx) {
      var store = tx.objectStore(storeName);
      var cursorRequest;

      if (opts.indexName) {
        cursorRequest = store.index(opts.indexName).openCursor();
      }
      else {
        cursorRequest = store.openCursor();
      }

      cursorRequest.onsuccess = function() {
        var cursor = cursorRequest.result;

        if (!cursor) {
          resolve();
          return;
        }

        callback(cursor.value, cursor.key, cursor);
        cursor.continue();
      };

      cursorRequest.onerror = function() {
        reject(cursorRequest.error);
      };
    });
  }.bind(this));
};

IDBHelperProto.delete = function(store, key) {
  return this.transaction(store, 'readwrite', function(tx) {
    tx.objectStore(store).delete(key);
  });
};

module.exports = IDBHelper;