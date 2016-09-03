/* Load plugins */
var gulp = require('gulp'),
  sass = require('gulp-sass'),
  watch = require('gulp-watch'),
  notify = require('gulp-notify'),
  connect = require('gulp-connect'),
  cp = require('child_process');

gulp.task('connectBuild', function() {
  connect.server({
    root: '_site',
    port: 8000,
    livereload: true
  });
});

/**
 * Build the Jekyll Site
 */
gulp.task('jekyll', function(done) {
  notify('Compiling Jekyll');

  return cp.spawn('jekyll', ['build'], {stdio: 'inherit'})
  .on('close', function(){
    gulp.start('css');
    done();
  });
});

gulp.task('jekyll-rebuild', ['jekyll'], function() {    
  gulp.src('./CNAME')
    .pipe( connect.reload() )
    .pipe( notify('Compiling Jekyll') );
});

gulp.task('css', function() {
  return gulp.src(['./_sass/*.scss', './*.scss'])
    .pipe( sass() )
    .pipe( gulp.dest('./_site') )
    .pipe( connect.reload() )
    .pipe( notify('CSS task complete!') )
});

/* Default task */
gulp.task('default', ['connectBuild', 'watch'], function() {
  gulp.start('jekyll');
});

/* Watch task */
gulp.task('watch', function() {
  gulp.watch(['./_sass/*.scss', './*.scss'], ['css']);
  gulp.watch([
    '*.md', '*.html', '_layouts/*.html', '_posts/*',
    'images/*', '*.yml', '_includes/*', 'js/*.js'
  ], ['jekyll-rebuild']);
});
