[![latest version](https://img.shields.io/npm/v/handlebars-loader.svg?maxAge=2592000)](https://www.npmjs.com/package/handlebars-loader)
[![downloads](https://img.shields.io/npm/dm/handlebars-loader.svg?maxAge=2592000)](https://www.npmjs.com/package/handlebars-loader)
[![Build Status](https://travis-ci.org/pcardune/handlebars-loader.svg?branch=master)](https://travis-ci.org/pcardune/handlebars-loader)
[![Coverage Status](https://coveralls.io/repos/github/pcardune/handlebars-loader/badge.svg?branch=master)](https://coveralls.io/github/pcardune/handlebars-loader?branch=master)

# handlebars-loader

A [handlebars](http://handlebarsjs.com) template loader for [webpack](https://github.com/webpack/webpack).

*Handlebars 4 now supported*

## Installation

`npm i handlebars-loader --save`

## General Usage

### webpack configuration

```javascript
{
  ...
  module: {
    rules: [
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

The loader resolves partials and helpers automatically. They are looked up relative to the current directory (this can be modified with the `rootRelative` option) or as a module if you prefix with `$`.

```handlebars
A file "/folder/file.handlebars".
{{> partial}} will reference "/folder/partial.handlebars".
{{> ../partial}} will reference "/partial.handlebars".
{{> $module/partial}} will reference "/folder/node_modules/module/partial.handlebars".
{{helper}} will reference the helper "/folder/helper.js" if this file exists.
{{[nested/helper] 'helper parameter'}} will reference the helper "/folder/nested/helper.js" if this file exists, passes 'helper parameter' as first parameter to helper.
{{../helper}} {{$module/helper}} are resolved similarly to partials.
```

The following query (or config) options are supported:

 - *helperDirs*: Defines additional directories to be searched for helpers. Allows helpers to be defined in a directory and used globally without relative paths. You must surround helpers in subdirectories with brackets (Handlerbar helper identifiers can't have forward slashes without this). See [example](https://github.com/altano/handlebars-loader/tree/master/examples/helperDirs)
 - *runtime*: Specify the path to the handlebars runtime library. Defaults to look under the local handlebars npm module, i.e. `handlebars/runtime`.
 - *extensions*: Searches for templates with alternate extensions. Defaults are .handlebars, .hbs, and '' (no extension).
 - *inlineRequires*: Defines a regex that identifies strings within helper/partial parameters that should be replaced by inline require statements.
 - *rootRelative*: When automatically resolving partials and helpers, use an implied root path if none is present. Default = `./`. Setting this to be empty effectively turns off automatically resolving relative handlebars resources for items like `{{helper}}`. `{{./helper}}` will still resolve as expected.
 - *knownHelpers*: Array of helpers that are registered at runtime and should not explicitly be required by webpack. This helps with interoperability for libraries like Thorax [helpers](http://thoraxjs.org/api.html#template-helpers).
 - *exclude*: Defines a regex that will exclude paths from resolving. This can be used to prevent helpers from being resolved to modules in the `node_modules` directory.
 - *debug*: Shows trace information to help debug issues (e.g. resolution of helpers).
 - *partialDirs*: Defines additional directories to be searched for partials. Allows partials to be defined in a directory and used globally without relative paths. See [example](https://github.com/altano/handlebars-loader/tree/master/examples/partialDirs)
 - *preventIndent*: Prevent partials from being indented inside their parent template.
 - *ignorePartials*: Prevents partial references from being fetched and bundled. Useful for manually loading partials at runtime.
 - *ignoreHelpers*: Prevents helper references from being fetched and bundled. Useful for manually loading helpers at runtime.
 - *compat*: Enables recursive field lookup for Mustache compatibility. See the Handlebars.js [documentation](https://github.com/wycats/handlebars.js#differences-between-handlebarsjs-and-mustache) for more information.
 - *config*: Tells the loader where to look in the webpack config for configurations for this loader. Defaults to `handlebarsLoader`.
 - *config.partialResolver* You can specify a function to use for resolving partials. To do so, add to your webpack config:
    ```js
    handlebarsLoader: {
        partialResolver: function(partial, callback){
            // should pass the partial's path on disk
            // to the callback. Callback accepts (err, locationOnDisk)
        }
    }
    ```
- *config.helperResolver* You can specify a function to use for resolving helpers. To do so, add to your webpack config:
    ```js
    handlebarsLoader: {
        helperResolver: function(helper, callback){
            // should pass the helper's path on disk
            // to the callback if one was found for the given parameter.
            // Callback accepts (err, locationOnDisk)
            // Otherwise just call the callback without any arguments
        }
    }
    ```
See [`webpack`](https://github.com/webpack/webpack) documentation for more information regarding loaders.

## Full examples

See the [examples](examples/) folder in this repo. The examples are fully runnable and demonstrate a number of concepts (using partials and helpers) -- just run `webpack` in that directory to produce `dist/bundle.js` in the same folder, open index.html.

## Change Log

See the [CHANGELOG.md](https://github.com/pcardune/handlebars-loader/blob/master/CHANGELOG.md) file.

## License

MIT (http://www.opensource.org/licenses/mit-license)
