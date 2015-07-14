# gulp-tmtsprite


```
npm install gulp-tmtsprite --save
```

```
var tmtsprite = require('gulp-tmtsprite');

gulp.src('./src/css/style-*.css')
    .pipe(tmtsprite())
    .pipe(gulpif('*.png', gulp.dest('./dist/sprite/'), gulp.dest('./dist/css/')));
```
