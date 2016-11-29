/**
 * Created by AppRegistry on 6/17/16.
 */

var pkg = require('./package.json');

var BOWER           = './bower_components/';
var BUILD           = './build/';
var CLIENT          = './src/client/';
var CLIENT_APP      = CLIENT + 'app/';
var CLIENT_SHARED   = CLIENT + 'shared/';
var ROOT            = './';
var SERVER          = './src/server/';
var TEMP            = './.tmp/';

var config = {

    appName : pkg.name,

    /*
     File paths
     */
    allJs : [
        './src/**/*.js',
        './*.js'
    ],
    build: BUILD,
    client: CLIENT,
    css: TEMP + '**/*.css',
    fonts: BOWER + 'font-awesome/fonts/**/*.*',
    htmlTemplates: CLIENT_APP + '**/*.html',
    index: CLIENT + 'index.html',
    images: CLIENT + 'images/**/*.*',
    js: [
        CLIENT_SHARED + '**/*.module.js',
        CLIENT_SHARED + '**/*.js',
        CLIENT_APP + '**/*.module.js',
        CLIENT_APP + '**/*.js'
    ],
    less: [
        CLIENT + 'styles/**/*.less'
    ],
    root: ROOT,
    server: SERVER,
    staticCss: [
        BOWER + 'font-awesome/css/font-awesome.css',
        BOWER + 'bootstrap/dist/css/bootstrap.css'
    ],
    temp: TEMP,

    /*
     Template Cache
     */
    templateCache: {
        file: 'templates.js',
        options: {
            module: 'app.core',
            standalone: false,
            root: 'app/'
        }
    },

    /*
     Optimized Files
     */
    optimized: {
        app : 'app.js',
        lib : 'lib.js'
    },

    /*
     Bower & NPM locations
     */
    bower: {
        json: require('./bower.json'),
        directory: BOWER,
        ignorePath: '../..'
    },
    packages: [
        ROOT + 'package.json',
        ROOT + 'bower.json'
    ],

    /*
     Node settings
     */
    defaultPort: 7203,
    nodeServer: SERVER + 'app.js',

    /*
     Browser Sync
     */
    browserReloadDelay: 1000
};

config.getWiredepDefaultOptions = function(){
    var options = {
        bowerJson: config.bower.json,
        directory: config.bower.directory,
        ignorePath: config.bower.ignorePath
    };
    return options;
};

module.exports = config;
