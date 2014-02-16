var loaderUtils = require("loader-utils"),
    handlebars = require("handlebars"),
    path = require("path"),
    basename = path.basename;

module.exports = function(content) {
  if (this.cacheable)
    this.cacheable();

  if (typeof content !== "string")
    throw new Error("Expecting content to be a string, got '" + typeof content + "'");

  var query = loaderUtils.parseQuery(this.query);

  var templateName;
  if (query.key && query.key.length && query.key.length > 0) {
    templateName = query.key;
  }
  else if (query.partial && query.partial.length && query.partial.length > 0) {
    templateName = query.partial;
  }
  else {
    templateName = path.basename(this.resourcePath);
    templateName = templateName.replace(/\.partial\.handlebars$/, '');
    templateName = templateName.replace(/\.handlebars$/, '');
    templateName = templateName.replace(/\.hbs$/, '');
  }

  var options = {
    partial: !!query.partial,
    runtimePath: query.runtimePath,
    namespace: query.namespace
  };

  return generateTemplateExport(content, templateName, options);
};

// @TODO This typo in webpack was fixed in 0.8, but I don't see it in the docs anymore. What was it for and is it still needed?
module.exports.seperable = true;

// A webpack-relevant subset of ./bin/handlebars console script, but without
// the need to call a command line script.  Also allows us to pass in the
// source from webpack instead of a path to the file. This makes handlebars-
// loader a chainable loader, with source-as-input and source-as-output.
var generateTemplateExport = function(source, templateName, options) {
  var runtimePath = JSON.stringify(options.runtimePath || path.join(__dirname, "node_modules", "handlebars", "runtime"));
  var namespace = options.namespace || 'Handlebars.namespace';

  var output = [];
  output.push('var Handlebars = require(' + runtimePath + ').default;\n');
  output.push('  var template = Handlebars.template, templates = ');
  output.push(namespace);
  output.push(' = ');
  output.push(namespace);
  output.push(' || {};\n');

  var handlebarsOptions = {
    knownHelpersOnly: true
  };

  output.push('module.exports = ');
  if (options.partial) {
    output.push('Handlebars.partials[\'' + templateName + '\'] = template(' + handlebars.precompile(source, handlebarsOptions) + ');\n');
  }
  else {
    output.push('templates[\'' + templateName + '\'] = template(' + handlebars.precompile(source, handlebarsOptions) + ');\n');
  }

  output = output.join('');

  return output;
};