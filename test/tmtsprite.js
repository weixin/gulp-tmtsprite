'use strict';

var should = require('should');
var sprite = require('../lib/sprite');
var path = require('path');
var vfs = require('vinyl-fs');
var through2 = require('through2');
var lwip = require('node-lwip');
var noop = function () {
};

vfs.src('./css/**/style-*.css')
    .pipe(sprite())
    .pipe(vfs.dest('./output/css'));
