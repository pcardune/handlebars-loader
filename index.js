var loaderUtils = require("loader-utils");
var handlebars = require("handlebars");
var async = require("async");
var util = require("util");
var path = require("path");
var assign = require("object-assign");
var fastreplace = require('./lib/fastreplace');
var findNestedRequires = require('./lib/findNestedRequires');

function versionCheck(hbCompiler, hbRuntime) {
  return hbCompiler.COMPILER_REVISION === (hbRuntime["default"] || hbRuntime).COMPILER_REVISION;
}

/**
 * Check the loader query and webpack config for loader options. If an option is defined in both places,
 * the loader query takes precedence.
 *
 * @param {Loader} loaderContext
 * @returns {Object}
 */
function getLoaderConfig(loaderContext) {
  var query = loaderUtils.getOptions(loaderContext) || {};
  var configKey = query.config || 'handlebarsLoader';
  var config = (loaderContext.rootContext ? loaderContext.rootContext[configKey] : loaderContext.options[configKey]) || {};
  delete query.config;
  return assign({}, config, query);
}

module.exports = function(source) {
  if (this.cacheable) this.cacheable();
  var loaderApi = this;
  var query = getLoaderConfig(loaderApi);
  var runtimePath = query.runtime || require.resolve("handlebars/runtime");

  if (!versionCheck(handlebars, require(runtimePath))) {
    throw new Error('Handlebars compiler version does not match runtime version');
  }

  var precompileOptions = query.precompileOptions || {};

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

  [].concat(query.knownHelpers, precompileOptions.knownHelpers).forEach(function(k) {
    if (k && typeof k === 'string') {
      knownHelpers[k] = true;
    }
  });

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
      if (name === '@partial-block') {
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

  // Define custom visitor for further template AST parsing
  var Visitor = handlebars.Visitor;
  function InternalBlocksVisitor() {
    this.partialBlocks = [];
    this.inlineBlocks = [];
  }

  InternalBlocksVisitor.prototype = new Visitor();
  InternalBlocksVisitor.prototype.PartialBlockStatement = function(partial) {
    this.partialBlocks.push(partial.name.original);
    Visitor.prototype.PartialBlockStatement.call(this, partial);
  };
  InternalBlocksVisitor.prototype.DecoratorBlock = function(partial) {
    if (partial.path.original === 'inline') {
      this.inlineBlocks.push(partial.params[0].value);
    }

    Visitor.prototype.DecoratorBlock.call(this, partial);
  };

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

    // AST holder for current template
    var ast = null;

    // Compile options
    var opts = assign({
      knownHelpersOnly: !firstCompile,
      // TODO: Remove these in next major release
      preventIndent: !!query.preventIndent,
      compat: !!query.compat
    }, precompileOptions, {
      knownHelpers: knownHelpers,
    });

    try {
      if (source) {
        ast = hb.parse(source, opts);
        template = hb.precompile(ast, opts);
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

      if (query.ignoreHelpers) {
        unclearStuffCallback();
      } else {
        resolve(request, 'unclearStuff', function(err, result) {
          if (!err && result) {
            knownHelpers[stuff.substr(1)] = true;
            foundHelpers[stuff] = result;
            needRecompile = true;
          }
          foundUnclearStuff[stuff] = true;
          unclearStuffCallback();
        });
      }
    };

    var defaultPartialResolver = function defaultPartialResolver(request, callback){
      request = referenceToRequest(request, 'partial');
      // Try every extension for partials
      var i = 0;
      (function tryExtension() {
        if (i >= extensions.length) {
          var errorMsg = util.format("Partial '%s' not found", request);
          return callback(new Error(errorMsg));
        }
        var extension = extensions[i++];

        resolve(request + extension, 'partial', function(err, result) {
          if (!err && result) {
            return callback(null, result);
          }
          tryExtension();
        });
      }());
    };

    var resolvePartialsIterator = function(partial, partialCallback) {
      if (foundPartials[partial]) return partialCallback();
      // Strip the # off of the partial name
      var request = partial.substr(1);

      var partialResolver = query.partialResolver || defaultPartialResolver;

      if(query.ignorePartials) {
        return partialCallback();
      } else {
        partialResolver(request, function(err, resolved){
          if(err) {
            var visitor = new InternalBlocksVisitor();

            visitor.accept(ast);

            if (
              visitor.inlineBlocks.indexOf(request) !== -1 ||
              visitor.partialBlocks.indexOf(request) !== -1
            ) {
              return partialCallback();
            } else {
              return partialCallback(err);
            }

          }
          foundPartials[partial] = resolved;
          needRecompile = true;
          return partialCallback();
        });
      }
    };

    var resolveHelpersIterator = function(helper, helperCallback) {
      if (foundHelpers[helper]) return helperCallback();
      var request = referenceToRequest(helper.substr(1), 'helper');

      if (query.ignoreHelpers) {
        helperCallback();
      } else {
        var defaultHelperResolver = function(request, callback){
          return resolve(request, 'helper', callback);
        };

        var helperResolver = query.helperResolver || defaultHelperResolver;

        helperResolver(request, function(err, result) {
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
      }
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
