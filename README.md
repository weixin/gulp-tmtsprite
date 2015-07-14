# gulp-tmtsprite


```
npm install gulp-tmtsprite --save
npm install gulp-if --save
```

```
var gulpif = require('gulp-if');
var tmtsprite = require('gulp-tmtsprite');

gulp.src('./src/css/style-*.css')
    .pipe(tmtsprite())
    .pipe(gulpif('*.png', gulp.dest('./dist/sprite/'), gulp.dest('./dist/css/')));
```

> tmtsprite 会导出 *.png 和 *.css 文件，使用 gulpif 来判断文件类型，保存到不同的目录。

需要被合并的图片，请放置于 slice 目录下，并在 CSS 中这样调用：

```
.icon-word {
    background-image: url('../slice/work.png');
}
```
