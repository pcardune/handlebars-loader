// Duplicates a webpack-relevant subset of ./bin/handlebars, but without the
// need to call a command line script.  Also allows us to pass in the source
// from webpack instead of a path to the file. This makes handlebars-loader a
// chainable loader, with source and input and source as output.

var handlebars = require("handlebars/lib/handlebars"), // @TODO better path?
    path = require("path"),
    basename = path.basename,
    uglify = require("uglify-js");

module.exports = function(source, templateName, options) {
  var runtimePath = options.runtimePath || JSON.stringify(path.join(__dirname, "node_modules", "handlebars", "dist", "handlebars.runtime"));
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

  // Clean the template name
  templateName = basename(templateName);
  templateName = templateName.replace(/\.handlebars$/, '');

  output.push('module.exports = ');
  if (options.partial) {
    output.push('Handlebars.partials[\'' + templateName + '\'] = template(' + handlebars.precompile(source, handlebarsOptions) + ');\n');
  }
  else {
    output.push('templates[\'' + templateName + '\'] = template(' + handlebars.precompile(source, handlebarsOptions) + ');\n');
  }

  output = output.join('');

  // @TODO Add source map support
  // @TODO Switch to version ~2.3.4 of uglify
  if (options.minimize) {
    var ast = uglify.parser.parse(output);
    ast = uglify.uglify.ast_mangle(ast);
    ast = uglify.uglify.ast_squeeze(ast);
    output = uglify.uglify.gen_code(ast);
  }

  return output;
};