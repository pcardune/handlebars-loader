# Change Log

## [Unreleased]
- New `partialDirs` query option allows specifying additional directories to be searched for partials. Thank you @lostthetrail.
- New `preventIndent` query option to avoid nested partials adding whitespace to
  `textarea` and `pre` elements.

## [1.2.0] - 2016-03-15

### Added
- Helpers can now use ECMAScript 6 export syntax and have their default export used. Thank you @kt0.
- New `exclude` query option lets you prevent helpers from being resolved to
  modules in specified directories (such as `node_modules`). Thank you @ericmatthys.


See [keepachangelog.com](http://keepachangelog.com/) for how to update this file.
