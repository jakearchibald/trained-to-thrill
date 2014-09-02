function IDBHelper(name, version, upgradeCallback) {
  var request = indexedDB.open(name, version);
  this.ready = IDBHelper.promisify(request);
  request.onupgradeneeded = function(event) {
    upgradeCallback(request.result, event.oldVersion);
  };
}

IDBHelper.supported = 'indexedDB' in self;

IDBHelper.promisify = function(obj) {
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
};

IDBHelper.iterate = function(cursorRequest, callback) {
  var oldCursorContinue;

  function cursorContinue() {
    this._continuing = true;
    return this.oldCursorContinue.call(this);
  }

  return new Promise(function(resolve, reject) {
    cursorRequest.onsuccess = function() {
      var cursor = cursorRequest.result;

      if (!cursor) {
        resolve();
        return;
      }

      if (cursor.continue != cursorContinue) {
        oldCursorContinue = cursor.continue;
        cursor.continue = cursorContinue;
      }

      callback(cursor);

      if (!cursor._continuing) {
        resolve();
      }
    };

    cursorRequest.onerror = function() {
      reject(cursorRequest.error);
    };
  }.bind(this));
};

var IDBHelperProto = IDBHelper.prototype;

IDBHelperProto.transaction = function(stores, callback, opts) {
  opts = opts || {};

  return this.ready.then(function(db) {
    var mode = opts.mode || 'readonly';

    var tx = db.transaction(stores, mode);
    callback(tx, db);
    return IDBHelper.promisify(tx);
  });
};

module.exports = IDBHelper;