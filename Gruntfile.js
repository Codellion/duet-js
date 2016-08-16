module.exports = function(grunt) {
  // hack to avoid loading a Gruntfile
  // You can skip this and just use a Gruntfile instead
  grunt.task.init = function() {};

  // Project configuration.
  // Combine all files in src/
  grunt.initConfig({
    ts: {
        default: {
            tsconfig: 'src/tsconfig.json'  
        }
    },
    uglify: {
      all_src : {
        options : {
          sourceMap : true,
          sourceMapName : 'sourceMap.map'
        },
        src : 'build/duet.js',
        dest : 'build/duet.min.js'
      }
    }
  });

  // Register your own tasks
  grunt.registerTask('default', function() {
    grunt.log.write('Ran my task.');
  });

  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Finally run the tasks, with options and a callback when we're done
  grunt.tasks(['default', 'ts:default', 'uglify'], {}, function() {
    grunt.log.ok('Done running tasks.');
  });

}
