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
	var isPartialsResolvingDisabled = query.disablePartialsResolving || false;

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
			if (foundPartials["$" + name]) {
				return "require(" + JSON.stringify(foundPartials["$" + name]) + ")";
			}
			foundPartials["$" + name] = null;
			return JavaScriptCompiler.prototype.nameLookup.apply(this, arguments);
		}
		else if (type === "helper") {
			if (foundHelpers["$" + name]) {
				return "require(" + JSON.stringify(foundHelpers["$" + name]) + ")";
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
			if (/^\$/.test(ref))
				return ref.substring(1);
			else if (type === 'helper' && query.helperDirs && query.helperDirs.length)
				return ref;
			else
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
					knownHelpers: knownHelpers
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

			var resolveWithContexts = function() {
				var context = contexts.shift();

				var traceMsg;
				if (debug) {
					traceMsg = path.normalize(context + "\\" + request);
					console.log("Attempting to resolve %s %s", type, traceMsg);
					console.log("request=%s", request);
				}

				loaderApi.resolve(context, request, function(err, result) {
					if (!err && result) {
						if (debug) console.log("Resolved %s %s", type, traceMsg);
						return callback(err, result);
					}
					else if (contexts.length > 0) {
						resolveWithContexts();
					}
					else {
						if (debug) console.log("Failed to resolve %s %s", type, traceMsg);
						return callback(err, result);
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
			if (foundPartials[partial]) return partialCallback();
			var request = referenceToRequest(partial.substr(1), 'partial');

			// Try every extension for partials
			var i = 0;
			(function tryExtension() {
				if (i > extensions.length) {
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
				+ 'module.exports = (Handlebars["default"] || Handlebars).template(' + template + ');' :
				'module.exports = function(){return "";};';

			loaderAsyncCallback(null, slug);
		};

		var resolvePartials = function(err) {
			if (err) return doneResolving(err);

			if (debug) {
				console.log("Attempting to resolve partials:");
				console.log(foundPartials);
			}

			// Resolve path for each partial
			// Can be disabled through the query
			var partialsToResolve = isPartialsResolvingDisabled ? {} : foundPartials;
			async.forEach(Object.keys(partialsToResolve), resolvePartialsIterator, doneResolving);
		};

		var resolveUnclearStuff = function(err) {
			if (err) return resolvePartials(err);

			if (debug) {
				console.log("Attempting to resolve unclearStuff:");
				console.log(foundUnclearStuff);
			}

			// Check for each found unclear item if it is a helper
			async.forEach(Object.keys(foundUnclearStuff), resolveUnclearStuffIterator, resolvePartials);
		};

		var resolveHelpers = function(err) {
			if (err) throw resolveUnclearStuff(err);

			if (debug) {
				console.log("Attempting to resolve helpers:");
				console.log(foundHelpers);
			}

			// Resolve path for each helper
			async.forEach(Object.keys(foundHelpers), resolveHelpersIterator, resolveUnclearStuff);
		};

		resolveHelpers();
	}());
};
