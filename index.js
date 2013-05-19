var loaderUtils = require("loader-utils"),
    handlebars = require("handlebars/lib/handlebars"),
    path = require("path"),
    basename = path.basename,
    UglifyJS = require("uglify-js");

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
  }

  var options = {
    partial: !!query.partial,
    minimize: !!this.minimize,
    runtimePath: query.runtimePath,
    namespace: query.namespace
  };

  return generateTemplateExport(content, templateName, options);
};

module.exports.seperable = true;

// A webpack-relevant subset of ./bin/handlebars console script, but without
// the need to call a command line script.  Also allows us to pass in the
// source from webpack instead of a path to the file. This makes handlebars-
// loader a chainable loader, with source-as-input and source-as-output.
var generateTemplateExport = function(source, templateName, options) {
  var runtimePath = JSON.stringify(options.runtimePath || path.join(__dirname, "node_modules", "handlebars", "dist", "handlebars.runtime"));
  var namespace = options.namespace || 'Handlebars.namespace';

  var output = [];
  output.push('var Handlebars = require(' + runtimePath + ');\n');
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

  if (options.minimize) {
    output = uglify(output);
  }

  return output;
};

var uglify = function(content) {
  var ast = UglifyJS.parse(content);

  // compressor needs figure_out_scope too
  ast.figure_out_scope();
  var compressorOptions = {
    warnings: false // Compressing the Handlebars templates is too noisy b/c there are
                    // almost always unused function parameters in the generated template
  };
  compressor = UglifyJS.Compressor(compressorOptions);
  ast = ast.transform(compressor);

  // need to figure out scope again so mangler works optimally
  ast.figure_out_scope();
  ast.compute_char_frequency();
  ast.mangle_names();

  // get Ugly content back :)
  return ast.print_to_string();
};