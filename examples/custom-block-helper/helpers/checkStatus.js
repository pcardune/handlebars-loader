module.exports = function (data, options) {
  return options.fn(data.info[0]);
};
