[![latest version](https://img.shields.io/npm/v/handlebars-loader.svg?maxAge=2592000)](https://www.npmjs.com/package/handlebars-loader)
[![downloads](https://img.shields.io/npm/dm/handlebars-loader.svg?maxAge=2592000)](https://www.npmjs.com/package/handlebars-loader)
[![Build Status](https://travis-ci.org/pcardune/handlebars-loader.svg?branch=master)](https://travis-ci.org/pcardune/handlebars-loader)
[![Coverage Status](https://coveralls.io/repos/github/pcardune/handlebars-loader/badge.svg?branch=master)](https://coveralls.io/github/pcardune/handlebars-loader?branch=master)
[![Reviewed by Hound](https://img.shields.io/badge/Reviewed_by-Hound-8E64B0.svg)](https://houndci.com)

# handlebars-loader

A [handlebars](http://handlebarsjs.com) template loader for [webpack](https://github.com/webpack/webpack).

_Handlebars 4 now supported_

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

- _helperDirs_: Defines additional directories to be searched for helpers. Allows helpers to be defined in a directory and used globally without relative paths. You must surround helpers in subdirectories with brackets (Handlerbar helper identifiers can't have forward slashes without this). See [example](https://github.com/altano/handlebars-loader/tree/master/examples/helperDirs)
- _runtime_: Specify the path to the handlebars runtime library. Defaults to look under the local handlebars npm module, i.e. `handlebars/runtime`.
- _extensions_: Searches for templates with alternate extensions. Defaults are .handlebars, .hbs, and '' (no extension).
- _inlineRequires_: Defines a regex that identifies strings within helper/partial parameters that should be replaced by inline require statements. **Note**: For this to work, you'll have to disable the `esModule` Option in the corresponding file-loader entry in your webpack config.
- _rootRelative_: When automatically resolving partials and helpers, use an implied root path if none is present. Default = `./`. Setting this to be empty effectively turns off automatically resolving relative handlebars resources for items like `{{helper}}`. `{{./helper}}` will still resolve as expected.
- _knownHelpers_: Array of helpers that are registered at runtime and should not explicitly be required by webpack. This helps with interoperability for libraries like Thorax [helpers](http://thoraxjs.org/api.html#template-helpers).
- _exclude_: Defines a regex that will exclude paths from resolving. This can be used to prevent helpers from being resolved to modules in the `node_modules` directory.
- _debug_: Shows trace information to help debug issues (e.g. resolution of helpers).
- _partialDirs_: Defines additional directories to be searched for partials. Allows partials to be defined in a directory and used globally without relative paths. See [example](https://github.com/altano/handlebars-loader/tree/master/examples/partialDirs)
- _ignorePartials_: Prevents partial references from being fetched and bundled. Useful for manually loading partials at runtime.
- _ignoreHelpers_: Prevents helper references from being fetched and bundled. Useful for manually loading helpers at runtime.
- _precompileOptions_: Options passed to handlebars precompile. See the Handlebars.js [documentation](http://handlebarsjs.com/reference.html#base-precompile) for more information.
- _config_: Tells the loader where to look in the webpack config for configurations for this loader. Defaults to `handlebarsLoader`.
- _config.partialResolver_ You can specify a function to use for resolving partials. To do so, add to your webpack config:
  ```js
  handlebarsLoader: {
      partialResolver: function(partial, callback){
          // should pass the partial's path on disk
          // to the callback. Callback accepts (err, locationOnDisk)
      }
  }
  ```
- _config.helperResolver_ You can specify a function to use for resolving helpers. To do so, add to your webpack config:
  `js handlebarsLoader: { helperResolver: function(helper, callback){ // should pass the helper's path on disk // to the callback if one was found for the given parameter. // Callback accepts (err, locationOnDisk) // Otherwise just call the callback without any arguments } } `
  See [`webpack`](https://github.com/webpack/webpack) documentation for more information regarding loaders.

## Full examples

See the [examples](examples/) folder in this repo. The examples are fully runnable and demonstrate a number of concepts (using partials and helpers) -- just run `webpack` in that directory to produce `dist/bundle.js` in the same folder, open index.html.

## Change Log

See the [CHANGELOG.md](https://github.com/pcardune/handlebars-loader/blob/master/CHANGELOG.md) file.

## License

MIT (http://www.opensource.org/licenses/mit-license)
