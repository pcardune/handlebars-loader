var path = require("path");

module.exports = {
  entry: "./app.js",
  output: {
    path: "dist",
    filename: "bundle.js",
    libraryTarget: 'umd',
    library: 'App'
  },
  resolve: {
    fallback: path.join(__dirname, "helpers")
  },
  externals: [{
      'handlebars/runtime': {
          root: 'Handlebars',
          amd: 'handlebars.runtime',
          commonjs2: 'handlebars/runtime',
          commonjs: 'handlebars/runtime'
      },
      'handlebars': {
          root: 'Handlebars',
          amd: 'Handlebars',
          commonjs: 'handlebars',
          commonjs2: 'handlebars'
      }
  }],
	module: {
		loaders: [{ test: /\.handlebars$/, loader: __dirname + "/../..?runtime=handlebars/runtime" }]
	}
};