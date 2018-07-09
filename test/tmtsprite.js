'use strict';

var should = require('should');
var sprite = require('../lib/sprite');
var path = require('path');
var vfs = require('vinyl-fs');
var through2 = require('through2');
var noop = function () {
};

vfs.src('./css/style-*.css')
   .pipe(sprite())
   .pipe(vfs.dest('./output'))
   .on('data', noop);

// require('mocha');
//
// describe('css-sprite (lib/sprite.js)', function () {
// });
