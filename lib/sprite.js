'use strict'

var through2 = require('through2')
var path = require('path')
var File = require('vinyl')

var async = require('async')
var lodash = require('lodash')
var imageinfo = require('imageinfo')
var layout = require('layout')
var lwip = require('node-lwip')
var fs = require('fs')
var Color = require('color')


module.exports = function (options) {

  var opt = lodash.extend({}, {
    orientation: 'binary-tree',
    sort: true,
    margin: 0,
    background: '#fff',
    opacity: 1,
    spriteOut: './',
    cssOut: './',
    slicePath: '../slice'
  }, options)

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

  return through2.obj(function (css, enc, callback) {

    var color = new Color(opt.background)
    opt.color = color.rgbArray()
    opt.color.push(opt.opacity)

    var layoutOrientation = opt.orientation === 'vertical' ? 'top-down' : opt.orientation === 'horizontal' ? 'left-right' : 'binary-tree'
    var layer = layout(layoutOrientation, {'sort': opt.sort})
    var layer2x = layout(layoutOrientation, {'sort': opt.sort})
    var layer3x = layout(layoutOrientation, {'sort': opt.sort})
    var cssContent
    var originCssContent
    var images = []
    var image1x = null
    var image2x = null
    var image3x = null

    RegExp.escape = function (s) {
      return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    }

    //保存CSS名称
    var cssBaseName = path.basename(css.path, '.css')

    var _this = this

    async.waterfall([

      //找出需要进行合并的图片
      function (cb) {

        originCssContent = cssContent = css.contents.toString()
        var sliceRegex = new RegExp('background-image:[\\s]*url\\(["\']?(?!http[s]?|/)[^)]*?('+ opt.slicePath +'/[\\w\\d\\s!./\\-\\_@]*\\.[\\w?#]+)["\']?\\)[^}]*?', 'ig')
        var codelines = cssContent.match(sliceRegex)

        if (!codelines || codelines.length === 0) {

          _this.push(new File({
            base: opt.cssOut,
            path: path.join(opt.cssOut, cssBaseName + ".css"),
            contents: new Buffer(cssContent)
          }))

          return callback(null)
        }

        var index = opt.slicePath.lastIndexOf('/')

        if(index === -1){
          opt.spriteOut = 'sprite/'
        }else{
          opt.spriteOut = opt.slicePath.substring(0, index+1 ) + 'sprite/'
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
            has2x: fs.existsSync(absolutePath.replace('.png', '@2x.png')),//是否有 @2x 图
            absolute2xPath: absolutePath.replace('.png', '@2x.png'),
            has3x: fs.existsSync(absolutePath.replace('.png', '@3x.png')),//是否有 @3x 图
            absolute3xPath: absolutePath.replace('.png', '@3x.png'),
            margin: opt.margin
          }

          //如果直接引用 @2x 图
          if (backgroundCodeLine.indexOf('@2x') > 0) {
            meta.has2x = true
            meta.absolute2xPath = absolutePath

            if (absolutePath.indexOf('@2x') > 0) {
              meta.has3x = fs.existsSync(absolutePath.replace('@2x.png', '@3x.png'))
              meta.absolute3xPath = absolutePath.replace('@2x.png', '@3x.png')
            }
          }

          //如果直接引用 @3x 图
          if (backgroundCodeLine.indexOf('@3x') > 0) {
            meta.has3x = true
            meta.absolute3xPath = absolutePath

            if(absolutePath.indexOf('@3x')){
              meta.has2x = fs.existsSync(absolutePath.replace('@3x.png', '@2x.png'))
              meta.absolute2xPath = absolutePath.replace('@3x.png', '@2x.png')
            }
          }

          //通过正则，匹配出 className
          var regexClassNameString = '(\\.?[^}]*?)\\s?{\\s?[^}]*?' + RegExp.escape(backgroundCodeLine)
          var regexClassName = new RegExp(regexClassNameString, 'ig')
          var classNameResult = cssContent.match(regexClassName)
          meta.className2x = []
          meta.className3x = []

          async.series([
            function (next) {
              if (meta.has2x) {

                for (var key in classNameResult) {
                  meta.className2x.push(classNameResult[key].replace(regexClassName, '$1'))
                }

                meta.margin = opt.margin * 2

                layerAddItem(layer2x, meta.absolute2xPath, meta, next)
              } else {
                next()
              }
            },

            function (next) {
              if (meta.has3x) {
                for (var key in classNameResult) {
                  meta.className3x.push(classNameResult[key].replace(regexClassName, '$1'))
                }

                meta.margin = opt.margin * 3

                layerAddItem(layer3x, meta.absolute3xPath, meta, next)
              } else {
                next()
              }
            }

          ], function () {
            if (!meta.has2x && !meta.has3x) {
              layerAddItem(layer, absolutePath, meta, eachCb)
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

        if (layerInfo.items.length > 0) {

          lwip.create(layerInfo.width, layerInfo.height, opt.color, function (err, image) {

            async.eachSeries(layerInfo.items, function (sprite, callback) {

              //图片合并
              image.paste(sprite.x + sprite.meta.margin, sprite.y + sprite.meta.margin, sprite.meta.img, callback)

              //CSS替换
              var code = 'background-image: url("' + opt.spriteOut + cssBaseName + '.png");'
              code += '  background-position: -' + (sprite.x + sprite.meta.margin) + 'px -' + (sprite.y + sprite.meta.margin) + 'px;'

              cssContent = cssContent.split(sprite.meta.backgroundCodeLine).join(code)

            }, function () {
              image1x = image
              cb(null, cssContent)
            })

          })

        } else {
          cb(null, cssContent)
        }

      },

      //2x
      function (cssContent, cb) {
        if (typeof cssContent === 'function') {
          cssContent = originCssContent
        }

        var retinaLayerInfo = layer2x.export()

        //存在 @2x 图
        if (retinaLayerInfo.items.length > 0) {

          var retinaCssContent = '\n\n@media only screen and (-webkit-min-device-pixel-ratio: 2),only screen and (min--moz-device-pixel-ratio: 2),only screen and (min-resolution: 240dpi) {'

          lwip.create(retinaLayerInfo.width, retinaLayerInfo.height, opt.color, function (err, image) {

            async.eachSeries(retinaLayerInfo.items, function (sprite, callback) {

              //图片合并
              image.paste(sprite.x + sprite.meta.margin, sprite.y + sprite.meta.margin, sprite.meta.img, callback)

              cssContent = cssContent.replace(sprite.meta.backgroundCodeLine, '')

              //添加 media query
              lodash.each(sprite.meta.className2x, function (item) {
                retinaCssContent += item
                retinaCssContent += '{background-image:url("' + opt.spriteOut + cssBaseName + '@2x.png");'
                retinaCssContent += '-webkit-background-size:' + retinaLayerInfo.width / 2 + 'px;'
                retinaCssContent += 'background-size:' + retinaLayerInfo.width / 2 + 'px;'
                retinaCssContent += 'background-position: -' + ((sprite.x + sprite.meta.margin) / 2) + 'px -' + ((sprite.y + sprite.meta.margin) / 2) + 'px;}'
              })

            }, function () {
              retinaCssContent += "}"

              cssContent += retinaCssContent

              image2x = image

              cb(null, cssContent)
            })

          })


        } else {
          if (image1x) {
            cb(null, cssContent)
          } else {
            cb(null)
          }
        }

      },

      //@3x
      function (cssContent, cb) {

        if (typeof cssContent === 'function') {
          cssContent = originCssContent
        }

        var retinaLayerInfo = layer3x.export()

        //存在 @3x 图
        if (retinaLayerInfo.items.length > 0) {

          var retinaCssContent = '\n\n@media only screen and (min-device-width: 414px) and (-webkit-min-device-pixel-ratio: 3) {'

          lwip.create(retinaLayerInfo.width, retinaLayerInfo.height, opt.color, function (err, image) {

            async.eachSeries(retinaLayerInfo.items, function (sprite, callback) {

              //图片合并
              image.paste(sprite.x + sprite.meta.margin, sprite.y + sprite.meta.margin, sprite.meta.img, callback)

              cssContent = cssContent.replace(sprite.meta.backgroundCodeLine, '')

              //添加 media query
              lodash.each(sprite.meta.className3x, function (item) {
                retinaCssContent += item
                retinaCssContent += '{background-image:url("' + opt.spriteOut + cssBaseName + '@3x.png");'
                retinaCssContent += '-webkit-background-size:' + retinaLayerInfo.width / 3 + 'px;'
                retinaCssContent += 'background-size:' + retinaLayerInfo.width / 3 + 'px;'
                retinaCssContent += 'background-position: -' + ((sprite.x + sprite.meta.margin) / 3) + 'px -' + ((sprite.y + sprite.meta.margin) / 3) + 'px;}'
              })

            }, function () {
              retinaCssContent += "}"

              cssContent += retinaCssContent

              image3x = image

              cb(null, cssContent)
            })

          })


        } else {
          if (image2x || image1x) {
            cb(null, cssContent)
          } else {
            cb(null)
          }
        }

      },

      // png to buffer
      // css to buffer
      function (cssContent, cb) {

        _this.push(new File({
          base: opt.cssOut,
          path: path.join(opt.cssOut, cssBaseName + ".css"),
          contents: new Buffer(cssContent)
        }))

        async.series([
          function (next) {
            if (image1x) {
              image1x.toBuffer('png', {}, function (err, spriteBuffer) {

                _this.push(new File({
                  base: opt.spriteOut,
                  path: path.join(opt.spriteOut, cssBaseName + '.png'),
                  contents: spriteBuffer
                }))

                next()
              })
            } else {
              next()
            }
          },

          function (next) {
            if (image2x) {
              image2x.toBuffer('png', {}, function (err, retinaSpriteBuffer) {

                _this.push(new File({
                  base: opt.spriteOut,
                  path: path.join(opt.spriteOut, cssBaseName + '@2x.png'),
                  contents: retinaSpriteBuffer
                }))

                next()

              })
            } else {
              next()
            }
          },

          function (next) {
            if (image3x) {
              image3x.toBuffer('png', {}, function (err, retinaSpriteBuffer) {

                _this.push(new File({
                  base: opt.spriteOut,
                  path: path.join(opt.spriteOut, cssBaseName + '@3x.png'),
                  contents: retinaSpriteBuffer
                }))

                next()

              })
            } else {
              next()
            }
          }
        ], function () {
          cb(null)
        })

      }

    ], function () {
      callback()
    })
  })


}


//vfs.src('../test/css/style-*.css')
//  .pipe(tmtsprite())
//  .on('data', function () {
//    var files = Array.apply(this, arguments)
//    for (var key in files) {
//    }
//  })
