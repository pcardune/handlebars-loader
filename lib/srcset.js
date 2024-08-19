var srcsetRegex = /(\s+\d+w($|\s*,)|\s+\d+x($|\s*,))/;

function hasSrcsetProperties(match) {
    return new RegExp(srcsetRegex).test(match);
}

module.exports = {
    srcsetRegex: srcsetRegex,
    hasSrcsetProperties: hasSrcsetProperties,
};