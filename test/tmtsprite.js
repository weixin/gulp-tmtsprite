'use strict';

var should = require('should');
var sprite = require('../lib/sprite');
var path = require('path');
var vfs = require('vinyl-fs');
var through2 = require('through2');
var noop = function () {
};

require('mocha');

describe('css-sprite (lib/sprite.js)', function () {

  it('should have a result', function (cb) {
    this.timeout(10000);
    var stream = sprite();


    vfs.src([path.join(__dirname, './css/style-willerce.css')])
      .pipe(stream)
      .pipe(vfs.dest(path.join(__dirname, './result')))
      .on('end', cb);

  })

});
