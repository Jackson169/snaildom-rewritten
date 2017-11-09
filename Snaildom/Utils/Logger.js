module.exports = {
  write: function(data) {
    console.log('[INFO] > ' + data) // Logs the data to the console
  },
  warn: function(data) {
    console.log('[WARNING] > ' + data);
  },
  error: function(data) {
    console.log('[ERROR] > ' + data);
  },
  fatal: function(data, delayed) {
    console.log('[FATAL] > ' + data);
    if(delayed && delayed == 1) {
      // Close the process after a delay
      logger.write('[FATAL] > Server shutting down after 5 seconds...');
      setTimeout(function() {
        process.exit();
      }, 5000);
    } else {
      logger.write('[FATAL] > Server shutting down...');
      process.exit();
    }
  }
}
