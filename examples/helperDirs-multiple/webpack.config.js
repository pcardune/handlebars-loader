var path = require("path");

module.exports = {
  entry: "./app.js",
  output: {
    path: "dist",
    filename: "bundle.js"
  },
	module: {
		loaders: [{ 
			test: /\.handlebars$/, 
			loader: __dirname + "/../../", 
			query: { 
				helperDirs: [
					__dirname + "/helpers1",
					__dirname + "/helpers2",
				]
			}
		}]
	}
};