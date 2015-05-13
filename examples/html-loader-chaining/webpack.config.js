var path = require("path");

module.exports = {
  entry: "./app.js",
  output: {
    path: "dist",
    filename: "bundle.js"
  },
  resolve: {
    fallback: path.join(__dirname, "helpers")
  },
	module: {
    /* In your code, it would be this instead:
    loaders: [{ test: /\.hbs.html$/, loader: "handlebars!html" }]
    */
		loaders: [{ test: /\.hbs.html$/, loader: __dirname + "/../../!html" }]
	}
};