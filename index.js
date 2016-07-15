var loaderUtils = require("loader-utils");
var handlebars = require("handlebars");
var async = require("async");
var util = require("util");
var path = require("path");
var fastreplace = require('./lib/fastreplace');
var findNestedRequires = require('./lib/findNestedRequires');

function versionCheck(hbCompiler, hbRuntime) {
  return hbCompiler.COMPILER_REVISION === (hbRuntime["default"] || hbRuntime).COMPILER_REVISION;
}

module.exports = function(source) {
  if (this.cacheable) this.cacheable();
  var loaderApi = this;
  var query = this.query instanceof Object ? this.query : loaderUtils.parseQuery(this.query);
  var runtimePath = query.runtime || require.resolve("handlebars/runtime");

  if (!versionCheck(handlebars, require(runtimePath))) {
    throw new Error('Handlebars compiler version does not match runtime version');
  }

  // Possible extensions for partials
  var extensions = query.extensions;
  if (!extensions) {
    extensions = [".handlebars", ".hbs", ""];
  }
  else if (!Array.isArray(extensions)) {
    extensions = extensions.split(/[ ,;]/g);
  }

  var rootRelative = query.rootRelative;
  if (rootRelative == null) {
    rootRelative = "./";
  }

  var foundPartials = {};
  var foundHelpers = {};
  var foundUnclearStuff = {};
  var knownHelpers = {};

  var queryKnownHelpers = query.knownHelpers;
  if (queryKnownHelpers) {
    [].concat(queryKnownHelpers).forEach(function(k) {
      knownHelpers[k] = true;
    });
  }

  var inlineRequires = query.inlineRequires;
  if (inlineRequires) {
    inlineRequires = new RegExp(inlineRequires);
  }

  var exclude = query.exclude;
  if (exclude) {
    exclude = new RegExp(exclude);
  }

  var debug = query.debug;

  var hb = handlebars.create();
  var JavaScriptCompiler = hb.JavaScriptCompiler;
  function MyJavaScriptCompiler() {
    JavaScriptCompiler.apply(this, arguments);
  }
  MyJavaScriptCompiler.prototype = Object.create(JavaScriptCompiler.prototype);
  MyJavaScriptCompiler.prototype.compiler = MyJavaScriptCompiler;
  MyJavaScriptCompiler.prototype.nameLookup = function(parent, name, type) {
    if (debug) {
      console.log("nameLookup %s %s %s", parent, name, type);
    }
    if (type === "partial") {
      if (name[0] == '@') {
        // this is a built in partial, no need to require it
        return JavaScriptCompiler.prototype.nameLookup.apply(this, arguments);
      }
      if (foundPartials["$" + name]) {
        return "require(" + JSON.stringify(foundPartials["$" + name]) + ")";
      }
      foundPartials["$" + name] = null;
      return JavaScriptCompiler.prototype.nameLookup.apply(this, arguments);
    }
    else if (type === "helper") {
      if (foundHelpers["$" + name]) {
        return "__default(require(" + JSON.stringify(foundHelpers["$" + name]) + "))";
      }
      foundHelpers["$" + name] = null;
      return JavaScriptCompiler.prototype.nameLookup.apply(this, arguments);
    }
    else if (type === "context") {
      // This could be a helper too, save it to check it later
      if (!foundUnclearStuff["$" + name]) foundUnclearStuff["$" + name] = false;
      return JavaScriptCompiler.prototype.nameLookup.apply(this, arguments);
    }
    else {
      return JavaScriptCompiler.prototype.nameLookup.apply(this, arguments);
    }
  };

  if (inlineRequires) {
    MyJavaScriptCompiler.prototype.pushString = function(value) {
      if (inlineRequires.test(value)) {
        this.pushLiteral("require(" + JSON.stringify(value) + ")");
      } else {
        JavaScriptCompiler.prototype.pushString.call(this, value);
      }
    };
    MyJavaScriptCompiler.prototype.appendToBuffer = function (str) {
      // This is a template (stringified HTML) chunk
      if (str.indexOf && str.indexOf('"') === 0) {
        var replacements = findNestedRequires(str, inlineRequires);
        str = fastreplace(str, replacements, function (match) {
          return "\" + require(" + JSON.stringify(match) + ") + \"";
        });
      }
      return JavaScriptCompiler.prototype.appendToBuffer.apply(this, arguments);
    };
  }

  hb.JavaScriptCompiler = MyJavaScriptCompiler;

  // This is an async loader
  var loaderAsyncCallback = this.async();

  var firstCompile = true;
  var compilationPass = 0;

  (function compile() {
    if (debug) {
      console.log("\nCompilation pass %d", ++compilationPass);
    }

    function referenceToRequest(ref, type) {
      if (/^\$/.test(ref)) {
        return ref.substring(1);
      }

      // Use a relative path for helpers if helper directories are given
      // unless automatic relative helper resolution has been turned off
      if (type === 'helper' && query.helperDirs && query.helperDirs.length && rootRelative !== '') {
        return './' + ref;
      }

      return rootRelative + ref;
    }

    // Need another compiler pass?
    var needRecompile = false;

    // Precompile template
    var template = '';

    try {
      if (source) {
        template = hb.precompile(source, {
          knownHelpersOnly: firstCompile ? false : true,
          knownHelpers: knownHelpers,
          preventIndent: query.preventIndent,
          compat: query.compat ? true : false
        });
      }
    } catch (err) {
      return loaderAsyncCallback(err);
    }

    var resolve = function(request, type, callback) {
      var contexts = [loaderApi.context];

      // Any additional helper dirs will be added to the searchable contexts
      if (query.helperDirs) {
        contexts = contexts.concat(query.helperDirs);
      }

      // Any additional partial dirs will be added to the searchable contexts
      if (query.partialDirs) {
        contexts = contexts.concat(query.partialDirs);
      }

      var resolveWithContexts = function() {
        var context = contexts.shift();

        var traceMsg;
        if (debug) {
          traceMsg = path.normalize(path.join(context, request));
          console.log("Attempting to resolve %s %s", type, traceMsg);
          console.log("request=%s", request);
        }

        var next = function(err) {
          if (contexts.length > 0) {
            resolveWithContexts();
          }
          else {
            if (debug) console.log("Failed to resolve %s %s", type, traceMsg);
            return callback(err);
          }
        };

        loaderApi.resolve(context, request, function(err, result) {
          if (!err && result) {
            if (exclude && exclude.test(result)) {
              if (debug) console.log("Excluding %s %s", type, traceMsg);
              return next();
            }
            else {
              if (debug) console.log("Resolved %s %s", type, traceMsg);
              return callback(err, result);
            }
          }
          else {
            return next(err);
          }
        });
      };

      resolveWithContexts();
    };

    var resolveUnclearStuffIterator = function(stuff, unclearStuffCallback) {
      if (foundUnclearStuff[stuff]) return unclearStuffCallback();
      var request = referenceToRequest(stuff.substr(1), 'unclearStuff');
      resolve(request, 'unclearStuff', function(err, result) {
        if (!err && result) {
          knownHelpers[stuff.substr(1)] = true;
          foundHelpers[stuff] = result;
          needRecompile = true;
        }
        foundUnclearStuff[stuff] = true;
        unclearStuffCallback();
      });
    };

    var resolvePartialsIterator = function(partial, partialCallback) {
      if (!!query.ignorePartials || foundPartials[partial]) return partialCallback();
      var request = referenceToRequest(partial.substr(1), 'partial');

      // Try every extension for partials
      var i = 0;
      (function tryExtension() {
        if (i >= extensions.length) {
          var errorMsg = util.format("Partial '%s' not found", partial.substr(1));
          return partialCallback(new Error(errorMsg));
        }
        var extension = extensions[i++];

        resolve(request + extension, 'partial', function(err, result) {
          if (!err && result) {
            foundPartials[partial] = result;
            needRecompile = true;
            return partialCallback();
          }
          tryExtension();
        });
      }());
    };

    var resolveHelpersIterator = function(helper, helperCallback) {
      if (foundHelpers[helper]) return helperCallback();
      var request = referenceToRequest(helper.substr(1), 'helper');

      resolve(request, 'helper', function(err, result) {
        if (!err && result) {
          knownHelpers[helper.substr(1)] = true;
          foundHelpers[helper] = result;
          needRecompile = true;
          return helperCallback();
        }

        // We don't return an error: we just fail to resolve the helper.
        // This is b/c Handlebars calls nameLookup with type=helper for non-helper
        // template options, e.g. something that comes from the template data.
        helperCallback();
      });
    };

    var doneResolving = function(err) {
      if (err) return loaderAsyncCallback(err);

      // Do another compiler pass if not everything was resolved
      if (needRecompile) {
        firstCompile = false;
        return compile();
      }

      // export as module if template is not blank
      var slug = template ?
        'var Handlebars = require(' + JSON.stringify(runtimePath) + ');\n'
        + 'function __default(obj) { return obj && (obj.__esModule ? obj["default"] : obj); }\n'
        + 'module.exports = (Handlebars["default"] || Handlebars).template(' + template + ');' :
        'module.exports = function(){return "";};';

      loaderAsyncCallback(null, slug);
    };

    var resolveItems = function(err, type, items, iterator, callback) {
      if (err) return callback(err);

      var itemKeys = Object.keys(items);

      if (debug) {
        console.log("Attempting to resolve ", type, ":", itemKeys);
      }

      // Resolve path for each item
      async.each(itemKeys, iterator, callback);
    };

    var resolvePartials = function(err) {
      resolveItems(err, 'partials', foundPartials, resolvePartialsIterator, doneResolving);
    };

    var resolveUnclearStuff = function(err) {
      resolveItems(err, 'unclearStuff', foundUnclearStuff, resolveUnclearStuffIterator, resolvePartials);
    };

    var resolveHelpers = function(err) {
      resolveItems(err, 'helpers', foundHelpers, resolveHelpersIterator, resolveUnclearStuff);
    };

    resolveHelpers();
  }());
};
