var shell = require('shelljs');

module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        uglify: {
            production: {
                files: {
                    'js/fileboy.min.js': ['js/jquery.min.js', 'js/*.js']
                }
            },
            debug: {
                files: {
                    'js/fileboy.min.js': ['js/jquery.min.js', 'js/*.js']
                },
                options: {
                    compress: false,
                    mangle: false,
                    beautify: true
                }
            }
        },
        jshint: {
            options: {
                curly: true,
                browser: true,
                globals: {
                    define: true
                }
            },
            all: ["Gruntfile.js", "*.js", "js/*.js", "!js/bootstrap.min.js", "!js/jquery.min.js", "!js/shortcut.js"]
        },

        jsbeautifier: {
            verify: {
                src: ['Gruntfile.js', "*.js", "js/*.js", "!js/bootstrap.min.js", "!js/jquery.min.js", "!js/shortcut.js"],
                options: {
                    mode: 'VERIFY_ONLY'
                }
            },
            modify: {
                src: ['Gruntfile.js', "*.js", "js/*.js", "!js/bootstrap.min.js", "!js/jquery.min.js", "!js/shortcut.js"],
            }
        },
        clean: ["js/fileboy.min.js"],
        githooks: {
            all: {
                'pre-commit': 'uglify:production'
            }
        }
    });

    grunt.registerTask('beautify', 'jsbeautifier:modify');
    grunt.registerTask('verify', 'jsbeautifier:verify');
    grunt.registerTask('default', ['clean', 'verify', 'jshint', 'beautify', 'uglify:production']);
    grunt.registerTask('tags', function() {
        shell.exec('jsctags *.js');
    });
};
