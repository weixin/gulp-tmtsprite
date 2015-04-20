'use strict'

var through2 = require('through2')
var path = require('path')
var File = require('vinyl')

var async = require('async')
var lodash = require('lodash')
var imageinfo = require('imageinfo')
var layout = require('layout')
var lwip = require('node-lwip')
var vfs = require('vinyl-fs')
var fs = require('fs')
var Color = require('color')


function tmtsprite(opt) {

  opt = lodash.extend({}, {
    orientation: 'binary-tree',
    sort: true,
    margin: 2,
    background: '#fff',
    opacity: 1,
    spriteOut: './',
    cssOut: './'
  }, opt)

  var color = new Color(opt.background)
  opt.color = color.rgbArray()
  opt.color.push(opt.opacity)

  var layoutOrientation = opt.orientation === 'vertical' ? 'top-down' : opt.orientation === 'horizontal' ? 'left-right' : 'binary-tree'
  var layer = layout(layoutOrientation, {'sort': opt.sort})
  var retinaLayer = layout(layoutOrientation, {'sort': opt.sort})
  var cssContent, cssBaseName, cssFileName

  RegExp.escape = function (s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  };

  /**
   * 从CSS找出需要进行合并的雪碧图切片
   * @param css
   * @param enc
   * @param cb
   */
  function tmtSprite(css, enc, callback) {

    //保存CSS名称
    cssBaseName = path.basename(css.path, '.css')
    cssFileName = path.basename(css.path)

    var _this = this

    async.waterfall([

      //找出需要进行合并的图片
      function (cb) {

        cssContent = css.contents.toString()
        var sliceRegex = new RegExp('background-image:[\\s]*url\\(["\']?(?!http[s]?|/)[^]*?(../slice/[\\w\\d\\s!./\\-\\_@]*\\.[\\w?#]+)["\']?\\)[^}]*?', 'ig')
        var codelines = cssContent.match(sliceRegex)
        var images = []

        if (codelines.length === 0) {
          callback(null)
        }

        async.eachSeries(codelines, function (backgroundCodeLine, eachCb) {

          var relativePath = backgroundCodeLine.replace(sliceRegex, '$1')
          var absolutePath = path.join(path.dirname(css.path), relativePath)

          if (lodash.includes(images, absolutePath)) {
            return eachCb()
          }

          images.push(absolutePath)

          var meta = {
            backgroundCodeLine: backgroundCodeLine,//匹配出的代码行内容
            fileName: path.basename(relativePath),//文件名
            relativePath: relativePath,//相对路径
            absolutePath: absolutePath,//绝对路径
            hasRetina: fs.existsSync(absolutePath.replace('.png', '@2x.png')),//是否有 @2x 图
            absoluteRetinaPath: absolutePath.replace('.png', '@2x.png'),
            margin: opt.margin
          }

          layerAddItem(layer, absolutePath, meta, function () {

            //存在对应的 @2x 图片
            if (meta.hasRetina) {

              //通过正则，匹配出 className
              var regexClassNameString = '(\\.?[^}]*?)\\s?{\\s?[^}]*?' + RegExp.escape(backgroundCodeLine);
              var regexClassName = new RegExp(regexClassNameString, 'ig');
              var classNameResult = cssContent.match(regexClassName);
              meta.className = []

              for (var key in classNameResult) {
                meta.className.push(classNameResult[key].replace(regexClassName, '$1'))
              }

              meta.margin = opt.margin * 2;

              layerAddItem(retinaLayer, meta.absoluteRetinaPath, meta, eachCb)
            } else {
              eachCb()
            }

          })

        }, function () {
          cb()
        })

      },

      //雪碧图布局排列
      //CSS替换
      function (cb) {

        var layerInfo = layer.export()

        lwip.create(layerInfo.width, layerInfo.height, opt.color, function (err, image) {

          async.eachSeries(layerInfo.items, function (sprite, callback) {

            //图片合并
            image.paste(sprite.x + sprite.meta.margin, sprite.y + sprite.meta.margin, sprite.meta.img, callback)

            //CSS替换
            var code = 'background-image: url("../sprite/' + cssBaseName + '.png'
            code += '");\n'
            code += '  background-position: -' + (sprite.x + sprite.meta.margin) + 'px -' + (sprite.y + sprite.meta.margin) + 'px'

            cssContent = cssContent.split(sprite.meta.backgroundCodeLine).join(code)

            // console.log(cssContent)
            // console.log('----------------')

          }, function () {
            cb(null, image, cssContent)
          })

        })

      },

      //@2x雪原图布局排列
      //CSS 添加
      function (canvas, cssContent, cb) {

        var retinaLayerInfo = retinaLayer.export()

        //存在 @2x 图
        if (retinaLayerInfo.items.length > 0) {

          var retinaCssContent = '\n\n@media only screen and (-webkit-min-device-pixel-ratio: 2),only screen and (min--moz-device-pixel-ratio: 2),only screen and (min-resolution: 240dpi) {';

          lwip.create(retinaLayerInfo.width, retinaLayerInfo.height, opt.color, function (err, image) {

            async.eachSeries(retinaLayerInfo.items, function (sprite, callback) {

              //图片合并
              image.paste(sprite.x + sprite.meta.margin, sprite.y + sprite.meta.margin, sprite.meta.img, callback)

              //添加 media query
              lodash.each(sprite.meta.className, function(item){
                retinaCssContent += item;
                retinaCssContent += '{background-image:url("../sprite/' + cssBaseName + '@2x.png");';
                retinaCssContent += '-webkit-background-size:' + retinaLayerInfo.width / 2 + 'px;';
                retinaCssContent += 'background-size:' + retinaLayerInfo.width / 2 + 'px;}';
              })

            }, function () {
              retinaCssContent += "}";

              cssContent += retinaCssContent;

              cb(null, canvas, image, cssContent)
            })

          })


        } else {
          cb(null, canvas, null, cssContent)
        }

      },

      // canvas to buffer
      // css to bufer
      function (canvas, retinaCanvas, cssContent, cb) {

        canvas.toBuffer('png', {}, function (err, spriteBuffer) {

          _this.push(new File({
            base: opt.cssOut,
            path: path.join(opt.cssOut, cssBaseName + ".css"),
            contents: new Buffer(cssContent)
          }));

          _this.push(new File({
            base: opt.spriteOut,
            path: path.join(opt.spriteOut, cssBaseName + '.png'),
            contents: spriteBuffer
          }))

          if (retinaCanvas) {
            retinaCanvas.toBuffer('png', {}, function (err, retinaSpriteBuffer) {

              _this.push(new File({
                base: opt.spriteOut,
                path: path.join(opt.spriteOut, cssBaseName + '@2x.png'),
                contents: retinaSpriteBuffer
              }))

              cb(null)

            })
          } else {
            cb(null)
          }

        })

      }

    ], function () {
      callback()
    })
  }

  function layerAddItem(layer, imgAbsolutePath, meta, callback) {

    fs.readFile(imgAbsolutePath, function (err, data) {

      if (err) throw err

      lwip.open(data, imageinfo(data).format.toLowerCase(), function (err, img) {

        if (!err) {

          layer.addItem({
            height: img.height() + meta.margin,
            width: img.width() + meta.margin,
            meta: lodash.extend({img: img}, meta)
          })

          callback()

        } else {
          console.log('Ignoring ' + imgAbsolutePath + ' -> ' + err.toString())
          callback()
        }
      })

    })


  }

  return through2.obj(tmtSprite)

}

module.exports = tmtsprite;

//vfs.src('../test/css/style-*.css')
//  .pipe(tmtsprite())
//  .on('data', function () {
//    var files = Array.apply(this, arguments)
//    for (var key in files) {
//    }
//  })
