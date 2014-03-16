var loaderUtils = require("loader-utils");
var handlebars = require("handlebars");
var async = require("async");
var util = require("util");

module.exports = function(source) {
	if (this.cacheable) this.cacheable();
	var loaderApi = this;
	var query = loaderUtils.parseQuery(this.query);
	var runtimePath = require.resolve("handlebars/runtime");

	// Possible extensions for partials
	var extensions = query.extensions;
	if (!extensions) {
		extensions = [".handlebars", ".hbs", ""];
	}
	else if (!Array.isArray(extensions)) {
		extensions = extensions.split(/[ ,;]/g);
	}

	var foundPartials = {};
	var foundHelpers = {};
	var foundUnclearStuff = {};
	var knownHelpers = {};

	var hb = handlebars.create();
	var JavaScriptCompiler = hb.JavaScriptCompiler;
	function MyJavaScriptCompiler() {
		JavaScriptCompiler.apply(this, arguments);
	}
	MyJavaScriptCompiler.prototype = Object.create(JavaScriptCompiler.prototype);
	MyJavaScriptCompiler.prototype.compiler = MyJavaScriptCompiler;
	MyJavaScriptCompiler.prototype.nameLookup = function(parent, name, type) {
		if (type === "partial") {
			if (foundPartials["$" + name]) {
				return "require(" + JSON.stringify(foundPartials["$" + name]) + ")";
			}
			foundPartials["$" + name] = null;
			return JavaScriptCompiler.prototype.nameLookup.call(this, parent, name, type);
		}
		else if (type === "helper") {
			if (foundHelpers["$" + name]) {
				return "require(" + JSON.stringify(foundHelpers["$" + name]) + ")";
			}
			return JavaScriptCompiler.prototype.nameLookup.call(this, parent, name, type);
		}
		else if (type === "context") {
			// This could be a helper too, save it to check it later
			if (!foundUnclearStuff["$" + name]) foundUnclearStuff["$" + name] = false;
			return JavaScriptCompiler.prototype.nameLookup.call(this, parent, name, type);
		}
		else {
			return JavaScriptCompiler.prototype.nameLookup.call(this, parent, name, type);
		}
	};
	hb.JavaScriptCompiler = MyJavaScriptCompiler;

	// This is an async loader
	var loaderAsyncCallback = this.async();

	(function compile() {
		// Need another compiler pass?
		var needRecompile = false;

		// Precompile template
		var template = hb.precompile(source, {
			knownHelpersOnly: true,
			knownHelpers: knownHelpers
		});

		// Check for each found unclear item if it is a helper
		async.forEach(Object.keys(foundUnclearStuff), function(stuff, unclearStuffCallback) {
			if (foundUnclearStuff[stuff]) return unclearStuffCallback();
			var request = referenceToRequest(stuff.substr(1));
			loaderApi.resolve(loaderApi.context, request, function(err, result) {
				if (!err && result) {
					knownHelpers[stuff.substr(1)] = true;
					foundHelpers[stuff] = result;
					needRecompile = true;
				}
				foundUnclearStuff[stuff] = true;
				unclearStuffCallback();
			});
		}, function() {

			// Resolve path for each partial
			async.forEach(Object.keys(foundPartials), function(partial, partialCallback) {
				if (foundPartials[partial]) return partialCallback();
				var request = referenceToRequest(partial.substr(1));

				// Try every extension for partials
				var i = 0;
				(function tryExtension() {
					var errorMsg = util.format("Partial '%s' not found", partial.substr(1));
					if (i > extensions.length) return partialCallback(new Error(errorMsg));
					var extension = extensions[i++];

					if (this.debug) {
						var path = require("path");
						var partialTrace = path.normalize(loaderApi.context + "\\" + request + extension);
						this.emitWarning("Attempting to resolve %s", partialTrace);
					}

					loaderApi.resolve(loaderApi.context, request + extension, function(err, result) {
						if (!err && result) {
							foundPartials[partial] = result;
							needRecompile = true;
							return partialCallback();
						}
						tryExtension();
					});
				}());
			}, function(err) {
				if (err) return loaderAsyncCallback(err);

				// Do another compiler pass if not everything was resolved
				if (needRecompile) return compile();

				// export as module
				loaderAsyncCallback(null, 'module.exports = require(' + JSON.stringify(runtimePath) + ').default.template(' + template + ');');
			});
		});
	}());
};

function referenceToRequest(ref) {
	if (/^~/.test(ref))
		return ref.substring(1);
	else
		return "./"+ref;
}