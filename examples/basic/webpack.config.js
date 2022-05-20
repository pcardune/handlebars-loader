var path = require("path");

module.exports = {
  entry: "./app.js",
  output: {
    path: "dist",
    filename: "bundle.js",
  },
  resolve: {
    fallback: path.join(__dirname, "helpers"),
  },
  module: {
    loaders: [{ test: /\.handlebars$/, loader: __dirname + "/../../" }],
  },
};
