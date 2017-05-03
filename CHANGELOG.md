# Change Log

## [Unreleased]

### Added
- Added `ignoreHelpers` option to skip automatic lookup/bundling of helpers

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
- Your feature here!
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
