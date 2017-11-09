const fs = require('fs');
const logger = require('../Utils/Logger');

var baseDir = __dirname + '/';

function HandlerBase(server) {
  this.server = server;
  this.world = server.world;

  this.database = server.database;
  this.handlers = {};

  this.loadHandlers();

  return this.handlers;
}

HandlerBase.prototype.loadHandlers = function() {
	var files = fs.readdirSync(baseDir);
	files.forEach((file) => {
		if(file != 'Base.js') {
			var handler = require(baseDir + file);
			this.handlers[file] = new handler(this);
		}
	});

	var intHandlers = Object.keys(this.handlers).length;

	if(intHandlers > 0) {
		if(intHandlers > 1) {
			logger.write('Loaded ' + intHandlers + ' handlers.');
		} else {
			logger.write('Loaded ' + intHandlers + ' handler.');
		}
	}
};

module.exports = HandlerBase;
