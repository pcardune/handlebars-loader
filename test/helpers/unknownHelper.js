var handlebars = require('handlebars');
var runtime    = require('handlebars/runtime');
var exports    = runtime['default'];

exports.registerHelper('unknownHelper', function (text) {
  return new handlebars.SafeString('I am an unknown helper: ' + text);
});

module.exports = exports;
