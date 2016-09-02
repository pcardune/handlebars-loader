var fs = require('fs'),
    path = require('path');

function WebpackLoaderMock (options) {
  this.context = options.context || '';
  this.query = options.query;
  this.options = options.options || {};
  this._asyncCallback = options.async;
  this._resolveStubs = options.resolveStubs || {};
}

WebpackLoaderMock.prototype.resolve = function (context, resource, callback) {
  var stub = this._resolveStubs[resource],
      fullPath;

  if (stub) {
    return callback(null, stub);
  }

  if (context) {
    // TODO: this is pretty hacky, assuming .js files - if we wanted to really
    // mock this out, we'd need to do sort of what the loader _actually_ does:
    // try a bunch of extensions (set via config) until one is found.
    fullPath = path.join(context, resource + '.js');
    if (fs.existsSync(fullPath)) {
      return callback(null, fullPath);
    }
  }

  callback(null, null);
};

WebpackLoaderMock.prototype.async = function () {
  return this._asyncCallback;
};

module.exports = WebpackLoaderMock;
