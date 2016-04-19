## gulp-tmtsprite [![NPM version](https://badge.fury.io/js/gulp-tmtsprite.png)](http://badge.fury.io/js/gulp-tmtsprite) [![devDependency Status](https://david-dm.org/weixin/gulp-tmtsprite/dev-status.png?theme=shields.io)](https://david-dm.org/weixin/gulp-tmtsprite#info=devDependencies)

> Automatically generate sprites image and CSS.   
> (with retina @2x, @3x supported)

**NPM Home Page:** [https://www.npmjs.com/package/gulp-tmtsprite](https://www.npmjs.com/package/gulp-tmtsprite)

## Install

Install with [NPM](https://npmjs.org/):

```javascript
npm install gulp-tmtsprite --save
npm install gulp-if --save
```

## Usage

**gulpfile.js** 

```javascript
var gulpif = require('gulp-if');
var tmtsprite = require('gulp-tmtsprite');

gulp.src('./src/css/style-*.css')
    .pipe(tmtsprite())
    .pipe(gulpif('*.png', gulp.dest('./dist/sprite/'), gulp.dest('./dist/css/')));
        	
```

**Options**
Custom your slice image path

```javascript
var gulpif = require('gulp-if');
var tmtsprite = require('gulp-tmtsprite');

gulp.src('./src/css/style-*.css')
    .pipe(tmtsprite({slicePath: '../slice'}))
    .pipe(gulpif('*.png', gulp.dest('./dist/sprite/'), gulp.dest('./dist/css/')));

```

## Result

**CSS In** -> `style-index.less`


```css
.icon-test {
	width: 32px;
	height: 32px;
	background-image: url(../slice/test.png);
}
```
_**Tips:** try [gulp-LazyImageCSS](https://www.npmjs.com/package/gulp-lazyimagecss/) if you are too lazy to type image `width` / `height` and more._


**CSS Out** -> `style-index.css`

```css
.icon-test {
	background-image: url(../sprite/style-index.png);
}

// Retina 2x supported
@media only screen and (-webkit-min-device-pixel-ratio: 2),
only screen and (min--moz-device-pixel-ratio: 2),
only screen and (-webkit-min-device-pixel-ratio: 2.5),
only screen and (min-resolution: 240dpi) {
.icon-test { 
	background-image:url("../sprite/style-index@2x.png");
	background-position: -36px -66px;
	background-size: 32px;
}
}
```
_**Tips:** Retina 3x is ready based on image name, like `icon-xxx@3x.png` with `@3x` string inside._

----

**Image In** -> `./slice/*.png`

![image-in](http://ww4.sinaimg.cn/large/644eac00gw1eyz3t0c7cyj212y0kr7bk.jpg)

**Image Out** -> `./sprite/style-index.png`

![image-out](http://ww2.sinaimg.cn/large/644eac00gw1eyz3xvar6fj212y0krtdf.jpg)

_**Tips:** 3x sprite is an option when needed._

## Know Issues

* 2x slice images' size should be **even number**, like `24x26@2x.png` not `23x27@2x.png`

## Release History

* 0.0.21 Fix replacing of slice refference in different quote style
* 0.0.14 Retina @3x supported
* 0.0.12 @2x image background-postion fixed
* 0.0.10 Duplicate slice using supported
* 0.0.1 First Release

## Team & License

* [TmT Team](https://github.com/orgs/tmt/people)
* [MIT License](http://en.wikipedia.org/wiki/MIT_License)
