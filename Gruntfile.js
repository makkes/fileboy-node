var shell = require('shelljs');

module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        jshint: {
            options: {
                curly: true,
                browser: true,
                globals: {
                    define: true
                }
            },
            all: ["Gruntfile.js", "*.js", "js/*.js"]
        },

        jsbeautifier: {
            verify: {
                src: ['Gruntfile.js', "*.js", "js/*.js"],
                options: {
                    mode: 'VERIFY_ONLY'
                }
            },
            modify: {
                src: ['Gruntfile.js', "*.js", "js/*.js"],
            }
        },

    });

    grunt.registerTask('beautify', 'jsbeautifier:modify');
    grunt.registerTask('verify', 'jsbeautifier:verify');
    grunt.registerTask('default', ['verify', 'jshint', 'beautify']);
    grunt.registerTask('tags', function() {
        shell.exec('jsctags *.js');
    });
};
