'use strict';

var sprite = require('./lib/sprite');
var through2 = require('through2');
var vfs = require('vinyl-fs');
var fs = require('graceful-fs');
var mkdirp = require('mkdirp');
var path = require('path');
var _ = require('lodash');

module.exports = function (opts) {
  return sprite(opts);
};
