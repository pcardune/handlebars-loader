var handlebars = require("handlebars");

module.exports = function (text) {
  return new handlebars.SafeString('<img src="' + text + '"/>');
};
