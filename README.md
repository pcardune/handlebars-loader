# handlebars loader for webpack

## General Usage

``` javascript
var template = require("handlebars!./file.handlebars");
// => returns file.handlebars content as template function

require("handlebars?partial!./partial.handlebars");
// => adds partial.handlebars content a partial that can then be used in a template. Simply requiring the partial, specifying to the loader that is a partial the with "?partial" query param, to make it available elsewhere
```

## Details

Using handlebars-loader to require templates and partials adds them to a local instantiation of the Handlebars runtime environment, local to webpack. If you include handlebars.js on your page, you will not be operating on the same content (by design).  In other words, the global namespace is not polluted.

All templates and partials are PRE-COMPILED.  Just like jade-loader, the pre-compiled templates and a minimal Handlebars runtime ONLY are added to your script by webpack, so the size of the final output is minimal and the runtime performance of using the templates is maximal.

See [`webpack`](https://github.com/webpack/webpack) documentation for more information regarding loaders.

## Full example

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