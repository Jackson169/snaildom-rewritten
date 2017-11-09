const logger = require('../../Snaildom/Utils/Logger');

function Plugin(base) {
  this.base = base;
  this.server = base.server;

  this.world = base.world;
  this.database = base.database;

  this.commands = {
    'help': 'handleHelp',
    'mm': 'handleModMessage'
  };
}

Plugin.prototype.handleCommand = function(name, params, client) {
  var found = false;

  if(this.commands[name]) {
    params.shift();

    var method = this.commands[name];

    if(this[method] && typeof this[method] == 'function') {
      this[method](params, client);
      found = true;
    } else {
      found = false;
    }
  } else {
    found = false;
  }

  if(found == false) {
    // Unknown command, either send alert or do nothing.
  }
};


Plugin.prototype.commandExists = function(name) {
  var found = false;

  if(this.commands[name]) {
    var method = this.commands[name];

    if(this[method] && typeof this[method] == 'function') {
      found = true;
    } else {
      found = false;
    }
  } else {
    found = false;
  }

  return found;
};

Plugin.prototype.handleModMessage = function(data, client) {
  if(client.rank >= 2) {
    var message = data.join(' ');
    var prefix = "<b>" + client.username + ":</b> &nbsp;";

    var strMessage = prefix + message;

    this.world.sendStaff({
      msg: "notice",
      params: {
        type: "General",
        message: strMessage
      }
    });
  }
};


module.exports = Plugin;
