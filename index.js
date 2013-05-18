var path = require("path");
var loaderUtils = require("loader-utils");
var exec = require("child_process").exec;
var util = require("util");

module.exports = function(source) {
  if (this.cacheable)
    this.cacheable();

  var callback = this.async();
  if (!callback)
    throw ("Expected callback");

  var handlebarsRuntimePath = JSON.stringify(path.join(__dirname, "node_modules", "handlebars", "dist", "handlebars.runtime"));
  var handlebarsCmd = path.join(__dirname, "node_modules", "handlebars", "bin", "handlebars");

  var template = path.basename(this.resourcePath);
  var query = loaderUtils.parseQuery(this.query);

  // @TODO Need support for any other params?
  var commandLine = util.format('node "%s" "%s" --commonjs "%s" --knownOnly', handlebarsCmd, this.resourcePath, handlebarsRuntimePath);

  if (query.partial)
    commandLine += " --partial";

  if (this.minimize)
    commandLine += " --min";

  // Duplicated logic from bin/handlebars to match the template key (@TODO add param to
  // handlebars to specify template precisely so we don't have to duplicate anything?)
  if (!root) {
    template = basename(template);
  }
  else if (template.indexOf(root) === 0) {
    template = template.substring(root.length+1);
  }
  template = template.replace(/\.handlebars$/, '');

  exec(commandLine, function(error, stdout, stderr){
    if (error !== null) {
      return callback(error);
    }

    var script = util.format("%s\nmodule.exports = templates['%s'];", stdout, template);
    callback(null, script);
  });
};

module.exports.seperable = true;
module.exports.raw = true;