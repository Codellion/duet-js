module.exports = function(grunt) {
  // hack to avoid loading a Gruntfile
  // You can skip this and just use a Gruntfile instead
  grunt.task.init = function() {};

  // Project configuration.
  // Combine all files in src/
  grunt.initConfig({
    concat: {
      dist: {

        src : ['src/BindableProperty.js', 'src/DynamicCode.js', 'src/IDictionary.js',
               'src/ModelProperty.js', 'src/ModelView.js', 'src/ObservableArray.js',
               'src/ObservableItem.js', 'src/Duet.js'],
        dest : 'build/duet.js'
      },
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

  /*grunt.loadNpmTasks('grunt-contrib-concat');
  // Finally run the tasks, with options and a callback when we're done
  grunt.tasks(['default', 'concat'], {}, function() {
    grunt.log.ok('Done running tasks.');
  });*/

  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Finally run the tasks, with options and a callback when we're done
  grunt.tasks(['default', 'uglify'], {}, function() {
    grunt.log.ok('Done running tasks.');
  });

}
