var cacheDB = require('./cachedb');
var Cache = require('./cache');

function CacheStorage() {}

var CacheStorageProto = CacheStorage.prototype;

CacheStorageProto.match = function(request, params) {
  return cacheDB.matchAcrossCaches(request, params);
};

CacheStorageProto.get = function(name) {
  return this.has(name).then(function(hasCache) {
    var cache;
    
    if (hasCache) {
      cache = new Cache();
      cache._name = name;
      return cache;
    }
    else {
      return null;
    }
  });
};

CacheStorageProto.has = function(name) {
  return cacheDB.hasCache(name);
};

CacheStorageProto.create = function(name) {
  return cacheDB.createCache(name).then(function() {
    var cache = new Cache();
    cache._name = name;
    return cache;
  }, function() {
    throw Error("Cache already exists");
  });
};

CacheStorageProto.delete = function(name) {
  return cacheDB.deleteCache(name);
};

CacheStorageProto.keys = function() {
  return cacheDB.cacheNames().then(function(names) {
    return names.map(function(name) {
      var cache = new Cache();
      cache._name = name;
      return cache;
    });
  });
};

module.exports = new CacheStorage();
