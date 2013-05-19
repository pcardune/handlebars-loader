# handlebars-loader

A [`handlebars`](http://handlebarsjs.com) template loader for [`webpack`](https://github.com/webpack/webpack).

## General Usage

### Your Gruntfile.js
``` javascript
webpack: {
  options: {
    ...
    module: {
      loaders: [
        ...
        { test: /\.partial\.handlebars$/, loader: "handlebars?partial" },
        { test: /\.handlebars$/,          loader: "handlebars", exclude: /\.partial\.handlebars$/ }
      ]
    },
```

### Your JS making use of the templates
``` javascript
var template = require("./file.handlebars");
// => returns file.handlebars content as template function

require("./file.partial.handlebars");
// => adds file content a partial (keyed to 'file') that can then be used in a template. Note that we don't store the return value because we are not returning a template here: just making the partial available to other templates.
```

## Details

Using handlebars-loader to require templates and partials adds them to a local instantiation of the Handlebars runtime environment, local to webpack. If you include handlebars.js on your page, you will not be operating on the same content (by design).  In other words, the global namespace is not polluted.

All templates and partials are PRE-COMPILED.  Just like jade-loader, the pre-compiled templates and a minimal Handlebars runtime ONLY are added to your script by webpack, so the size of the final output is minimal and the runtime performance of using the templates is maximal.

The filename, e.g. file.handlebars, determines the template key used. The key will be the filename minus the extensions '.partial.handlebars' and '.handlebars', if those are used:
* file.txt results in Handlebars.templates['file.txt'] being added.
* file.txt.handlebars results in Handlebars.templates['file.txt'] being added.
* !handlebars?partial!filepartial.xml.partial.handlebars results in Handlebars.partials['filepartial.xml'] being added (.partial is also stripped). e.g., in this case, you would reference `{{^filepartial.xml}}` to get at the partial.

You can manually invoke the loader and manually specify that a file is a partial like so:
```javascript
require("handlebars?partial!book.handlebars");
var bookListingTemplate = require("handlebars!book-listing.handlebars"); // this template can render using the partial above
```

There is only support for templates and partials for now.  If you want to be able to register helpers (or whatever), feel free to fork the code and add it, as it is very small and straightforward.

See [`webpack`](https://github.com/webpack/webpack) documentation for more information regarding loaders.

## Full example

### Gruntfile.js
``` javascript
webpack: {
  options: {
    ...
    module: {
      loaders: [
        ...
        { test: /\.partial\.handlebars$/, loader: "handlebars?partial" },
        { test: /\.handlebars$/,          loader: "handlebars", exclude: /\.partial\.handlebars$/ }
      ]
    },
    ...
  }
}
```

### book-listing.handlebars
```html
<h1>{{username}}</h1>
<div>
  {{#books}}{{> book}}{{/books}}
</div>
```

### book.handlebars (a partial)
```html
<h1>{{title}}</h1>
<div>
  {{synopsis}}
</div>
```

### your.script.that.uses.the.templates.js
```javascript
require("handlebars?partial!book.handlebars");
var bookListingTemplate = require("handlebars!book-listing.handlebars"); // this template can render using the partial above
```

## License

MIT (http://www.opensource.org/licenses/mit-license)