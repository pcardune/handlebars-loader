var assert = require('assert'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    sinon = require('sinon'),

    loader = require('../'),
    WebpackLoaderMock = require('./lib/WebpackLoaderMock'),

    TEST_TEMPLATE_DATA = {
      title: 'Title',
      description: 'Description',
      image: 'http://www.gravatar.com/avatar/205e460b479e2e5b48aec07710c08d50'
    };

function applyTemplate(source, options) {
  var requires = options && options.requireStubs || {},
      _require = sinon.spy(function (resource) {
        return requires[resource] || require(resource);
      }),
      _module = {};

  (new Function('module', 'require', source))(_module, _require);

  options.test(null, _module.exports(options.data), _require);
}

function loadTemplate(templatePath) {
  return fs.readFileSync(path.join(__dirname, templatePath)).toString();
}

function testTemplate(loader, template, options, testFn) {
  var resolveStubs = {};

  for (var k in options.stubs) {
    resolveStubs[k] = k;
  }

  loader.call(new WebpackLoaderMock({
    query: options.query,
    resolveStubs: resolveStubs,
    async: function (err, source) {
      if (err) {
        // Proxy errors from loader to test function
        return testFn(err);
      } else if (!source) {
        return testFn(new Error('Could not generate template'));
      }

      applyTemplate(source, {
        data: options.data,
        requireStubs: options.stubs,
        test: testFn
      });
    }
  }), loadTemplate(template));
}

function getStubbedHandlebarsTemplateFunction() {
  return sinon.stub().returns(function () {
    return 'STUBBED';
  });
}

describe('handlebars-loader', function () {

  it('should load simple handlebars templates', function (done) {
    testTemplate(loader, './simple.handlebars', {
      data: TEST_TEMPLATE_DATA
    }, function (err, output, require) {
      assert.ok(output, 'generated output');
      // There will actually be 1 require for the main handlebars runtime library
      assert.equal(require.callCount, 1,
        'should not have required anything extra');
      done();
    });
  });

  it('should convert helpers into require statements', function (done) {
    testTemplate(loader, './with-helpers.handlebars', {
      stubs: {
        'title': function (text) { return 'Title: ' + text; },
        './description': function (text) { return 'Description: ' + text; }
      },
      data: TEST_TEMPLATE_DATA
    }, function (err, output, require) {
      assert.ok(output, 'generated output');
      assert.ok(require.calledWith('title'),
        'should have loaded helper with module syntax');
      assert.ok(require.calledWith('./description'),
        'should have loaded helper with relative syntax');
      done();
    });
  });

  it('should convert partials into require statements', function (done) {
    testTemplate(loader, './with-partials.handlebars', {
      stubs: {
        './partial': require('./partial.handlebars'),
        'partial': require('./partial.handlebars')
      },
      data: TEST_TEMPLATE_DATA
    }, function (err, output, require) {
      assert.ok(output, 'generated output');
      assert.ok(require.calledWith('partial'),
        'should have loaded partial with module syntax');
      assert.ok(require.calledWith('./partial'),
        'should have loaded partial with relative syntax');
      done();
    });
  });

  it('allows specifying additional helper search directories', function (done) {
    testTemplate(loader, './with-dir-helpers.handlebars', {
      query: '?helperDirs[]=' + path.join(__dirname, 'helpers'),
      data: TEST_TEMPLATE_DATA
    }, function (err, output, require) {
      assert.ok(output, 'generated output');
      done();
    });
  });

  it('allows changing where implicit helpers and partials resolve from', function (done) {
    function testWithRootRelative(rootRelative, next) {
      var stubs = {},
          relativeHelper = rootRelative + 'description';

      stubs['title'] = function (text) { return 'Title: ' + text; };
      stubs[relativeHelper] = function (text) { return 'Description: ' + text; };

      testTemplate(loader, './with-helpers.handlebars', {
        query: '?rootRelative=' + rootRelative,
        stubs: stubs,
        data: TEST_TEMPLATE_DATA
      }, function (err, output, require) {
        assert.ok(output, 'generated output');
        assert.ok(require.calledWith(relativeHelper), 'required helper at ' + relativeHelper);
        next();
      });
    }

    async.each(['./', '../', '', 'path/to/stuff'], testWithRootRelative, function (err, results) {
      assert.ok(!err, 'no errors');
      done();
    });
  });

  it('allows specifying inline requires', function (done) {
    testTemplate(loader, './with-inline-requires.handlebars', {
      query: '?inlineRequires=^images\/',
      stubs: {
        './image': function (text) { return 'Image URL: ' + text; },
        'images/path/to/image': 'http://www.gravatar.com/avatar/205e460b479e2e5b48aec07710c08d50'
      }
    }, function (err, output, require) {
      assert.ok(output, 'generated output');
      assert.ok(require.calledWith('images/path/to/image'),
        'should have required image path');
      done();
    });
  });

  it('allows overriding the handlebars runtime path', function (done) {
    var templateStub = getStubbedHandlebarsTemplateFunction();
    var handlebarsAPI = { template: templateStub };

    testTemplate(loader, './simple.handlebars', {
      query: '?runtime=path/to/handlebars-runtime',
      stubs: {
        'path/to/handlebars-runtime': {
          default: handlebarsAPI
        }
      }
    }, function (err, output, require) {
      assert.ok(output, 'generated output');
      assert.ok(require.calledWith('path/to/handlebars-runtime'),
        'should have required handlebars runtime from user-specified path');
      assert.ok(!require.calledWith('handlebars/runtime'),
        'should not have required default handlebars runtime');
      done();
    });
  });

  it('supports either the CommonJS or ES6 style of the handlebars runtime', function (done) {
    var templateStub = getStubbedHandlebarsTemplateFunction();
    // The loader will require the runtime by absolute path, need to know that
    // in order to stub it properly
    var runtimePath = require.resolve('handlebars/runtime');

    function testWithHandlebarsAPI(api) {
      return function (next) {
        var stubs = {};
        stubs[runtimePath] = api;
        testTemplate(loader, './simple.handlebars', {
          stubs: stubs
        }, next);
      };
    }

    async.series([
      testWithHandlebarsAPI({ template: templateStub }), // CommonJS style
      testWithHandlebarsAPI({ default: { template: templateStub } }) // ES6 style
    ], function (err, results) {
      assert.ok(!err, 'no errors');
      assert.ok(results.filter(Boolean).length === 2, 'generated output');
      done();
    });
  });

  it('properly catches errors in template syntax', function (done) {
    testTemplate(loader, './invalid-syntax-error.handlebars', {}, function (err, output, require) {
      assert.ok(err, 'got error');
      assert.ok(err.message.indexOf('Parse error') >= 0, 'error was handlebars parse error');
      done();
    });
  });

  it('properly catches errors when unknown helper found', function (done) {
    testTemplate(loader, './invalid-unknown-helpers.handlebars', {
      stubs: {
        // A two-pass compile is required to see this error, and two-pass compilation
        // only happens when the loader finds SOME helper/partial during the first pass.
        // So we stub one that it can find.
        //
        // This means that if your template ONLY contains an unknown helper, the loader will not
        // detect an error, and you will only see problems when you attempt to render the template.
        //
        // TODO: figure out better way to detect helpers so the resolveHelpersIterator can reliably
        // catch errors, instead of assuming that the helper is actually a template var
        './unknownExistingHelper': function (text) { return text; }
      }
    }, function (err, output, require) {
      assert.ok(err, 'got error');
      assert.ok(err.message.indexOf('You specified knownHelpersOnly') >= 0, 'error was handlebars unknown helper error');
      done();
    });
  });

});
