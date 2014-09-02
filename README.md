# handlebars-loader

A [`handlebars`](http://handlebarsjs.com) template loader for [`webpack`](https://github.com/webpack/webpack).

## General Usage

### webpack configuration

```javascript
{
  ...
  module: {
    loaders: [
      ...
      { test: /\.handlebars$/, loader: "handlebars-loader" }
    ]
  }
}
```

### Your JS making use of the templates

```javascript
var template = require("./file.handlebars");
// => returns file.handlebars content as a template function
```

## Details

The loader resolves partials and helpers automatically. They are looked up relative to the current directory or as a module if you prefix with `$`.

```handlebars
A file "/folder/file.handlebars".
{{> partial}} will reference "/folder/partial.handlebars".
{{> ../partial}} will reference "/partial.handlebars".
{{> $module/partial}} will reference "/folder/node_modules/module/partial.handlebars".
{{helper}} will reference the helper "/folder/helper.js" if this file exists.
{{../helper}} {{$module/helper}} are resolved similarly to partials.
```

The following query options are supported:
 - *helperDirs*: Defines additional directories to be searched for helpers. Allows helpers to be defined in a directory and used globally without relative paths.
 - *extensions*: Searches for templates with alternate extensions. Defaults are .handlebars, .hbs, and '' (no extension).
 - *inlineRequires*: Defines a regex that identifies strings within helper/partial parameters that should be replaced by inline require statements.

See [`webpack`](https://github.com/webpack/webpack) documentation for more information regarding loaders.

## Full example

See example folder in this repo. The example is now fully runnable and demonstrates a number of concepts (using partials and helpers) -- just run `webpack` in that directory to produce dist/bundle.js in the same folder.

## License

MIT (http://www.opensource.org/licenses/mit-license)
