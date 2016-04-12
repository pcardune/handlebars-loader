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
                partialDirs: [
                    path.join(__dirname, 'templates', 'partials')
                ]
            }
        }]
    }
};
