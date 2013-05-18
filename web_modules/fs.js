var files = {};
exports.setFile = function(filename, content) { files[filename] = content; }
exports.readFileSync = function(filename) { return files[filename] || ""; }