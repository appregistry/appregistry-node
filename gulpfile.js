/**
 * Created by AppRegistry on 6/17/16.
 */

/*jshint node: true*/
'use strict';

var args        = require('yargs').argv;
var browserSync = require('browser-sync');
var config      = require('./gulp.config');
var del         = require('del');
var gulp        = require('gulp');

var $       = require('gulp-load-plugins')({ lazy: true });
var port    = process.env.PORT || config.defaultPort;

gulp.task('help', $.taskListing);
gulp.task('default', ['help']);

gulp.task('vet', function() {
    log('Analyzing source...');
    return gulp
        .src(config.allJs)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {verbose: true}))
        .pipe($.jshint.reporter('fail'));
});

gulp.task('vet-watch', function(){
    gulp.watch(config.allJs, ['vet']);
});

gulp.task('compile-less', [], function(){
    log ('Compiling less...');
    return gulp
        .src(config.less)
        .pipe($.plumber())
        .pipe($.less())
        .pipe($.autoprefixer({ browsers: ['last 2 version', '> 5%'] }))
        .pipe(gulp.dest(config.temp));
});

gulp.task('static-css', [], function(){
    log ('Copying static css...');
    return gulp
        .src(config.staticCss)
        .pipe($.plumber())
        .pipe(gulp.dest(config.temp));
});

gulp.task('styles', ['static-css', 'clean-styles', 'compile-less']);

gulp.task('fonts', ['clean-fonts'], function(){
    log('Copying fonts...');
    return gulp
        .src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images', ['clean-images'], function(){
    log('Copying images with compression...');
    return gulp
        .src(config.images)
        .pipe($.imagemin({ optimizationLevel: 4}))
        .pipe(gulp.dest(config.build + 'images'));
});

gulp.task('clean', function(done){
    var delConfig = [].concat(config.build, config.temp);
    log('Cleaning: ' + $.util.colors.blue(delConfig));
    return del(delConfig);
});

gulp.task('clean-fonts', function(done){
    return clean(config.build + 'fonts/**/*.*');
});

gulp.task('clean-images', function(done){
    return clean(config.build + 'images/**/*.*');
});

gulp.task('clean-styles', function(done){
    return clean(config.temp + '**/*.css');
});

gulp.task('clean-code', function(done){
    var files = [].concat(
        config.temp + '**/*.js',
        config.build + '**/*.html',
        config.build + 'js/**/*.js'
    );
    return clean(files);
});

gulp.task('less-watcher', function(){
    gulp.watch([config.less], ['styles']);
});

gulp.task('templatecache', ['clean-code'], function(){
    log('Creating AngularJS $templateCache...');
    return gulp
        .src(config.htmlTemplates)
        .pipe($.minifyHtml({ empty: true }))
        .pipe($.angularTemplatecache(
            config.templateCache.file,
            config.templateCache.options
        ))
        .pipe(gulp.dest(config.temp));
});

gulp.task('wiredep', function(){
    log('Wiring bower and app files...');
    var options = config.getWiredepDefaultOptions();
    var wiredep = require('wiredep').stream;
    return gulp
        .src(config.index)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.js)))
        .pipe(gulp.dest(config.client));
});

gulp.task('inject', ['wiredep', 'styles', 'templatecache'], function(){
    log('Wiring bower, app files, and calling wiredep...');
    return gulp
        .src(config.index)
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});

gulp.task('optimize', ['clean', 'inject', 'fonts', 'images'], function(){

    log('Optimizing build files...');

    // var assets = $.useref.assets({ searchPath: './' });
    var templateCache = config.temp + config.templateCache.file;
    var cssFilter = $.filter('**/*.css', { restore: true });
    var jsLibFilter = $.filter('**/' + config.optimized.lib, { restore: true });
    var jsAppFilter = $.filter('**/' + config.optimized.app, { restore: true });
    var revFilter = $.filter(['**/*.css', '**/*.js'], { restore: true });

    return gulp
        .src(config.index)
        .pipe($.plumber())
        .pipe($.inject(gulp.src(templateCache, { read: false }), {
            starttag: '<!-- inject:templates:js -->'
            }))

        .pipe($.useref({ searchPath: './' }))

        .pipe(cssFilter)
        .pipe($.csso())
        .pipe(cssFilter.restore)

        .pipe(jsLibFilter)
        .pipe($.uglify())
        .pipe(jsLibFilter.restore)

        .pipe(jsAppFilter)
        .pipe($.ngAnnotate())
        .pipe($.uglify())
        .pipe(jsAppFilter.restore)

        .pipe(revFilter)
        .pipe($.rev())
        .pipe(revFilter.restore)
        .pipe($.revReplace())

        .pipe(gulp.dest(config.build))
        .pipe($.rev.manifest())
        .pipe(gulp.dest(config.build));
});

/**
 * Bump the version
 * --type=pre will bump the prerelease version *.*.*-x
 * --type=patch or no flag will bump the patch version *.*.x
 * --type=minor will bump the minor version *.x.*
 * --type=major will bump the major version x.*.*
 * --version=1.2.3 will bump to a specific version and ignore other flags
 */
gulp.task('bump', function() {

    var msg = 'Bumping versions';
    var type = args.type;
    var version = args.version;
    var options = {};

    if (version) {
        options.version = version;
        msg += ' to ' + version;
    } else {
        options.type = type;
        msg += ' for a ' + type;
    }
    log(msg);

    return gulp
        .src(config.packages)
        .pipe($.print())
        .pipe($.bump(options))
        .pipe(gulp.dest(config.root));
});

gulp.task('serve-build', ['optimize'], function(){
    serve(false);
});

gulp.task('serve-dev', ['inject'], function(){
    serve(true);
});

// -----------------------------------

function serve(isDev){
    var nodeOptions = {
        script: config.nodeServer,
        delayTime: 1,
        env: {
            'PORT': port,
            'NODE_ENV': isDev ? 'dev-local' : 'build'
        },
        watch: [config.server]
    };

    return $.nodemon(nodeOptions)
        .on('restart', ['vet'], function (ev) {
            log('*** nodemon restarted');
            log('files changed on startup:\n' + ev);
            setTimeout(function(){
                browserSync.notify('Server files changed.  Reloading app...');
                browserSync.reload({ stream: false });
            }, config.browserReloadDelay);
        })
        .on('start', function () {
        log('*** nodemon started');
            startBrowserSync(isDev);
        })
        .on('crash', function () {
            log('*** nodemon crashed');
        })
        .on('exit', function () {
            log('*** nodemon exited gracefully');
        });
}

function changeEvent(event){
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

function startBrowserSync(isDev) {
    if (args.nosync || browserSync.active) { return; }

    log('Starting browser-sync on port ' + port);

    if (isDev) {
        gulp
            .watch([config.less], ['styles'])
            .on('change', function(event){ changeEvent(event); });
    } else {
        gulp
            .watch([config.less, config.js, config.htmlTemplates], ['optimize', browserSync.reload])
            .on('change', function(event){ changeEvent(event); });
    }

    var options = {
        online: true,
        proxy: 'localhost:' + port,
        port: 3000,
        files: isDev ? [config.client + '**/*.*',
                        '!' + config.client + '**/*.less',
                        config.temp + '**/*.css'] : [],
        ghostMode: {
            clicks: true,
            location: false,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: config.appName,
        notify: true,
        reloadDelay: 1000
    };
    browserSync(options);
}

function errorLogger(error){
    log('*** Start of Error ***');
    log(error);
    log('*** End of Error ***');
    /* jshint -W040 */
    this.emit('end');
}

function clean(path){
    log('Cleaning: ' + $.util.colors.blue(path));
    return del(path);
}

function log(msg) {
    if (typeof(msg) === 'object') {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.blue(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}

/* EOF */
