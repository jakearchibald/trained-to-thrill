var gulp = require('gulp');
var sass = require('gulp-ruby-sass');
var uglify = require('gulp-uglify');
var clean = require('gulp-clean');
var buffer = require('gulp-buffer');
var source = require('vinyl-source-stream');
var watchify = require('watchify');
var hbsfy = require('hbsfy');
var browserify = require('browserify');
var app = require('./server');
var urlSrc = require('./url-src');
var path = require('path');
var merge = require('merge-stream');

function sassTask(dev) {
  return gulp.src('www/static/sass/*.scss')
    .pipe(sass({
      sourcemap: dev,
      style: 'compressed'
    }))
    .pipe(gulp.dest('www/static/css/'));
}

gulp.task('sass', function() {
  return sassTask(true);
});

gulp.task('sass-build', function() {
  return sassTask(false);
});

function jsTask(bundler, out, dev) {
  var stream = bundler.bundle({
    debug: dev
  }).pipe(
    source(path.basename(out))
  );

  if (!dev) {
    stream = stream.pipe(buffer()).pipe(uglify());
  }

  return stream.pipe(
    gulp.dest(path.dirname(out))
  );
}

function makeBundler(inSrc, func) {
  return func(inSrc).transform(hbsfy);
}

var browserifyJsMap = {
  "./www/static/js-unmin/index.js": "www/static/js/page.js",
  "./www/static/js-unmin/sw/index.js": "www/static/js/sw.js"
};

gulp.task('js-build', function() {
  var streams = Object.keys(browserifyJsMap).map(function(inSrc) {
    var bundler = makeBundler(inSrc, browserify);
    return jsTask(bundler, browserifyJsMap[inSrc], false);
  });

  return merge(streams);
});

gulp.task('watch', ['sass'], function() {
  // sass
  gulp.watch('www/static/sass/**/*.scss', ['sass']);

  // js
  Object.keys(browserifyJsMap).forEach(function(inSrc) {
    var bundler = makeBundler(inSrc, watchify);
    bundler.on('update', rebundle);
    function rebundle() {
      return jsTask(bundler, browserifyJsMap[inSrc], true);
    }
    rebundle();
  });
});

gulp.task('server', function() {
  app.listen(3000);
});

gulp.task('clean', function() {
  gulp.src('build/*', {read: false})
    .pipe(clean());
});

gulp.task('build', ['clean', 'sass-build'], function() {
  var server = app.listen(3000);
  var writeStream = gulp.dest('build/');

  writeStream.on('end', server.close.bind(server));

  return urlSrc('http://localhost:3000/trained-to-thrill/', [
    '',
    'static/css/all.css',
    "static/js/page.js",
    "sw.js",
    "static/imgs/logo.svg",
    "static/imgs/icon.png"
  ]).pipe(writeStream);
});

gulp.task('default', ['watch', 'server']);