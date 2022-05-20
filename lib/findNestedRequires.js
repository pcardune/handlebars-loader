var fastparse = require("fastparse");

var findNestedRequires = function (match, strUntilValue, name, value, index) {
  if (!this.requiresPattern.test(value)) return;
  this.results.push({
    start: index + strUntilValue.length,
    length: value.length,
    value: value,
  });
};

var parser = new fastparse({
  outside: {
    "<!--.*?-->": true, // html comments
    "<![CDATA[.*?]]>": true, // cdata
    "<[!\\?].*?>": true, // scripting tags
    "</[^>]+>": true, // closing tag
    "<([a-zA-Z\\-:]+)\\s*": "inside", // opening tag
  },
  inside: {
    "((\\n|r|t)|\\s)+": true, // eat up whitespace (including escaped)
    ">": "outside", // end of attributes
    '(([a-zA-Z\\-]+)\\s*=\\s*\\\\")([^"]*)\\\\"': findNestedRequires, // quoted attributes
    "(([a-zA-Z\\-]+)\\s*=\\s*)([^\\s>]+)": findNestedRequires, // non-quoted attributes
  },
});

module.exports = function (str, requiresPattern) {
  return parser.parse("outside", str, {
    requiresPattern: requiresPattern,
    results: [],
  }).results;
};
