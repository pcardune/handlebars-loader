var path = require("path");
var loaderUtils = require("loader-utils");
var handlebarsHelper = require("./handlebars-helper");

module.exports = function(content) {
  if (this.cacheable)
    this.cacheable();

  if (typeof content !== "string")
    throw new Error("Expecting content to be a string, got '" + typeof content + "'");

  var query = loaderUtils.parseQuery(this.query);

  var templateName;
  if (query.key && query.key.length && query.key.length > 0)
    templateName = query.key;
  else if (query.partial && query.partial.length && query.partial.length > 0)
    templateName = query.partial;
  else
    templateName = path.basename(this.resourcePath);

  templateName = templateName.replace(/\.handlebars$/, '');

  var options = {
    partial: !!query.partial,
    minimize: !!this.minimize
  }; // @TODO Merge with webpack options?

  return handlebarsHelper(content, templateName, options);
};

module.exports.seperable = true;