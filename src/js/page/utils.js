function defaults(opts, defaultOpts) {
  var r = Object.create(defaultOpts);

  if (!opts) { return r; }
  
  for (var key in opts) if (opts.hasOwnProperty(key)) {
    r[key] = opts[key];
  }

  return r;
}

function toQuerystring(obj) {
  var str = [];
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  }
  return str.join("&");
}

var strToEls = (function () {
  var tmpEl = document.createElement('div');
  return function (str) {
    var r = document.createDocumentFragment();
    tmpEl.innerHTML = str;
    while (tmpEl.childNodes[0]) {
      r.appendChild(tmpEl.childNodes[0]);
    }
    return r;
  };
}());


module.exports = {
  defaults: defaults,
  toQuerystring: toQuerystring,
  strToEls: strToEls
};