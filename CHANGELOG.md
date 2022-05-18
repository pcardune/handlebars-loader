# Change Log

## [1.7.2] - 2022-05-18

### Fixed
- Upgraded async dependency to 3.2.2 (#207)

## [1.7.1] - 2018-12-18

### Fixed
- Fixed use stringifyRequest instead of absolute paths in loader output (#167)

## [1.7.0] - 2018-03-20

### Fixed
- Use `loaderContext.rootContext` instead of `loaderContext.options` when used with Webpack 4
- Fixed resolving of inline partials and partial blocks with failover content (#106, #135)

## [1.6.0] - 2017-09-01 ##

### Added
- Added `ignoreHelpers` option to skip automatic lookup/bundling of helpers
- Added `precompileOptions` to pass options to handlebars precompile

## [1.5.0] - 2017-04-20

### Added
- Added `helperResolver` config option to override the default helper resolution

### Fixed
- Fixed webpack deprecation warnings

## [1.4.0] - 2016-09-02

### Added
- Fixed resolving relative helpers on first pass when helper directories are given
- Added `ignorePartials` option to skip automatic lookup/bundling of partials
- Added `compat` option to enable Mustache lookup compatibility.
- Added `config` option to query so that configs can be specified in webpack
  config object or the loader query. Defaults to `handlebarsLoader`
- Added `partialResolver` config option to override the default partial
  resolution

### Fixed
- Previously, if a partial name began with an `@`, it was ignored and treated
  as an internal to handlebars partial. Now that checks specifically for
  partials named `@partial-block` so that `{{> @a/b/c.hbs }}` is a valid partial reference

## [1.3.0] - 2016-04-29

### Added
- New `partialDirs` query option allows specifying additional directories to be searched for partials. Thank you @lostthetrail.
- New `preventIndent` query option to avoid nested partials adding whitespace to
  `textarea` and `pre` elements.

## [1.2.0] - 2016-03-15

### Added
- Helpers can now use ECMAScript 6 export syntax and have their default export used. Thank you @kt0.
- New `exclude` query option lets you prevent helpers from being resolved to
  modules in specified directories (such as `node_modules`). Thank you @ericmatthys.


See [keepachangelog.com](http://keepachangelog.com/) for how to update this file.
