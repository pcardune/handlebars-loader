var placeholderRegex = /xxxxREPLACExxxx[0-9.]+xxxx/g;

function getPlaceholder() {
  return "xxxxREPLACExxxx" + Math.random() + "xxxx";
}

function replaceWithPlaceholders(str, replacements) {
  var content = [str];
  var placeholderMap = {};

  for (var i = replacements.length - 1, repl; (repl = replacements[i--]); ) {
    do {
      var placeholder = getPlaceholder();
    } while (placeholderMap[placeholder]);
    placeholderMap[placeholder] = repl.value;

    var x = content.pop();
    content.push(x.substr(repl.start + repl.length));
    content.push(placeholder);
    content.push(x.substr(0, repl.start));
  }
  content.reverse();

  return {
    content: content.join(""),
    placeholderMap: placeholderMap,
  };
}

module.exports = function (str, replacements, replaceFn) {
  var withPlaceholders = replaceWithPlaceholders(str, replacements);
  var placeholderMap = withPlaceholders.placeholderMap;

  placeholderRegex.lastIndex = 0;
  return withPlaceholders.content.replace(placeholderRegex, function (match) {
    var origValue = placeholderMap[match];
    if (!origValue) return match;
    return replaceFn(origValue);
  });
};
