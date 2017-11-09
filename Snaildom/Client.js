var _ = require('underscore');
var callerId = require('caller-id');

const logger = require(__dirname + '/Utils/Logger');
const utils = require(__dirname + '/Utils/Utils');
const encryption = require(__dirname + '/Utils/Encryption');

function Client(socket, _server) {
  // Create the client

  this.server = _server; // Store the server to use in the future
  this.database = _server.database; // Store the database for use in the future
  this.socket = socket; // Set the client's socket to the connected one

  this.x = 0; // Define the client's X parameter
  this.y = 0; // Define the client's Y parameter

  this.frame = 0; // Define the client's frame parameter

  this.room = -1;
  this.lastRoom = -1;

  this.score = 0;
  this.encrypted = true;
}

Client.prototype.write = function(data) {
  if(this.socket && this.socket.writable) {
    // Write data to client

    if(this.encrypted == false) {
      logger.write('Sent: ' + data);

      this.socket.write(data + '\0');
    } else {
      if(this.cipherKey) {
        var encryptedPacket = encryption.encode(data, this.cipherKey);
        var encrypted = "@ENC_START@" + encryptedPacket + "@ENC_END@";

        logger.write('Sent encrypted: ' + data + ' -> [' + encrypted + ']');

        this.socket.write(encrypted + '\0');
      } else {
        logger.write('Sent: ' + data);

        this.socket.write(data + '\0');
      }
    }
  }
};

Client.prototype.sendJSON = function(json) {
  if(typeof json == 'object') {
    this.write(JSON.stringify(json));
  } else {
    this.write(json);
  }
};

Client.prototype.setClient = function(data) {
  this.id = Number(data.id);
  this.username = data.username;

  this.health = Number(100);
  this.dead = false;

  this.title = data.title;
  this.color = data.color;

  this.rank = data.rank;
  this.knight = data.knight;
  this.royal = data.royal;

  this.inventory = data.inventory.split(',');
  this.furniture = data.furniture.split(',');
  this.friends = data.friends ? data.friends.split(',') : [];

  for(var i in this.friends) {
    var friend = this.friends[i].split('|');
    var sclient = this.server.getClientById(friend[0]);

    if(sclient) {
      friend.push(true);
    }

    this.friends[i] = friend.join('|');
  }

  this.shell = data.shell;
  this.head = data.head;
  this.face = data.face;
  this.body = data.body;
  this.toy = data.toy;

  this.level = data.level;
  this.gold = data.gold;

  this.kickCount = data.kickCount;
  this.banned = data.banned;
  this.banCount = data.banCount;

  this.ore = {
    silver: data.silverOre,
    gold: data.goldOre,
    iron: data.ironOre
  };

  this.tableId = 0;

  this.hasSword = data.sword;
  this.swordToy = "normalSword"; // To-do: Add weapon toys

  this.factions = data.factions.split('|');
};

Client.prototype.buildPlayerJSON = function(def) {
  var playerString = {
    id: this.id,
    username: this.username,
    x: this.x,
    y: this.y,
    pushFrame: this.frame,
    subtitle: this.title,
    rank: this.rank,
    knight: this.knight,
    royal: this.royal,
    color: this.color,
    shell: this.shell,
    head: this.head,
    face: this.face,
    body: this.body,
    toy: this.toy,
    inventory: this.getItems(),
    furniture: this.getFurniture(),
    friends: this.getFriendsArray(),
    factions: this.getFactions(),
    gold: this.gold,
    level: this.level,
    hasSword: this.hasSword
  };

  if(def) {
    return playerString;
  } else {
    return JSON.stringify(playerString);
  }
};

Client.prototype.respawn = function() {
  this.health = Number(100);
  this.dead = false;
};

Client.prototype.warn = function(reason) {
  this.sendJSON({
    msg: "warning",
    params: {
      warning: reason
    }
  });
};

Client.prototype.kick = function(reason) {
  ++this.kickCount;
  this.updateColumn("kickCount", this.kickCount);

  this.sendJSON({
    msg: "kick",
    params: {
      reason: reason
    }
  });

  this.disconnect();
};

Client.prototype.ban = function(reason, hours) {
  if(!hours || hours == 0) {
    hours = 999;
  }

  ++this.banCount;
  this.updateColumn("banCount", this.banCount);
  this.updateColumn("banned", hours);

  this.sendJSON({
    msg: "ban",
    params: {
      reason: reason,
      hours: hours
    }
  });

  this.disconnect();
};

Client.prototype.die = function() {
  this.dead = true;
  this.updateColumn("dead", 1);

  this.sendJSON({
    msg: "death"
  });

  this.disconnect();
};

Client.prototype.alert = function(msg) {
  this.sendJSON({
    msg: "message",
    params: {
      message: msg
    }
  });
};

Client.prototype.friendsWith = function(userId) {
  var found = false;
  userId = Number(userId);

  for(var i in this.friends) {
    if(!utils.isBlank(userId)) {
      var friend = this.friends[i].split('|');
      if(Number(friend[0]) == Number(userId)) {
        found = true;
      }
    }
  }

  return found;
};

Client.prototype.addGold = function(amt) {
  amt = Number(amt);

  if(amt > 0) {
    this.gold = Number(this.gold) + Number(amt);
    this.updateColumn("gold", this.gold);

    this.sendJSON({
      msg: "gold-add",
      params: {
        amount: amt,
        total: this.gold
      }
    });
  }
};

Client.prototype.delGold = function(amt) {
  amt = Number(amt);

  if(amt > 0) {
    this.gold = Number(this.gold) - Number(amt);
    this.updateColumn("gold", this.gold);

    this.sendJSON({
      msg: "gold-remove",
      params: {
        amount: amt,
        total: this.gold
      }
    });
  }
};

Client.prototype.addMaterial = function(mat) {
  var allowedMats = ['silver', 'gold', 'iron'];
  mat = mat.toLowerCase();

  if(allowedMats.indexOf(mat) > -1) {
    ++this.ore[mat];
    this.updateColumn(mat + 'Ore', this.ore[mat]);
  }
};

Client.prototype.removeMaterial = function(mat, amt) {
  if(!amt) {
    amt = 1;
  }

  if(this.ore[mat]) {
    --this.ore[mat];
    this.updateColumn(mat + "Ore", this.ore[mat]);
  }
};

Client.prototype.hasItem = function(itemId) {
  var found = false;

  if(utils.getItemCrumbById(itemId)) {
    if(this.inventory.indexOf(itemId) > -1) {
      found = true;
    }
  }

  return found;
};

Client.prototype.getShellArt = function() {
  var furnitureObj = {};
  var shellArt = this.shellArt.split('|');

  for(var i in shellArt) {
    var item = shellArt[i].split(':');
    var itemObj = utils.getFurnitureCrumbById(item[0]);

    if(itemObj) {
      furnitureObj[itemObj.identifier] = {
        id: itemObj.identifier,
        x: item[1],
        y: item[2]
      };
    }
  }

  return furnitureObj;
};

Client.prototype.setShellArt = function(newArt) {
  this.shellArt = newArt;
  this.updateColumn("shellArt", newArt);

  var shellArtObj = this.getShellArt();

  this.server.roomManager.sendJSON({
    msg: "update-shell-art",
    params: {
      shellArt: shellArtObj
    }
  }, this.room);
};

Client.prototype.getFriends = function() {
  var friends = [];

  for(var i in this.friends) {
    var friend = this.friends[i].split('|');

    if(friend && friend[0]) {
      var sclient = this.server.getClientById(friend[0]);
      var player = this.database.sync.getPlayer(friend[0])[0];

      if(player) {
        var clientObj = new Client(null, this.server);
        clientObj.setClient(player);

        var friendObj = JSON.parse(clientObj.buildPlayerJSON());

        if(sclient) {
          friendObj.online = true;
        }

        var friendId = friend[0];

        friends.push(friendObj);

        clientObj = null;
      }
    }
  }


  return friends;
};

Client.prototype.refreshFriends = function() {
  this.sendJSON({
    msg: "dynamic-friend-list",
    params: {
      list: this.getFriends()
    }
  });
};

Client.prototype.getFriendsArray = function() {
  var friends = [];

  for(var i in this.friends) {
    var friend = String(this.friends[i]);

    if(friend && !utils.isBlank(friend)) {
      friend = friend.split('|')
    } else {
      return;
    }

    if(friend && friend[0]) {
      var sclient = this.server.getClientById(friend[0]);
      var friendId = friend[0];

      friends.push(friendId);
    }
  }

  return friends;
};

Client.prototype.getFactions = function() {
  // to do
};

Client.prototype.getItems = function() {
  var items = [];

  for(var i in this.inventory) {
    var item = String(this.inventory[i]);

    if(item && !utils.isBlank(item)) {
      items.push(item);
    }
  }

  return items;
};

Client.prototype.getFurniture = function() {
  var furniture = [];

  for(var i in this.furniture) {
    var item = String(this.furniture[i]);

    if(item && !utils.isBlank(item)) {
      furniture.push(item);
    }
  }

  return furniture;
};

Client.prototype.sendError = function(message, disconnect) {
  if(disconnect && disconnect == true) {
    this.sendJSON({
      msg: "messageerror",
      params: {
        message: message,
        dc: true
      }
    });

    this.disconnect();
  } else {
    this.sendJSON({
      msg: "messageerror",
      params: {
        message: message
      }
    });
  }
};

Client.prototype.disconnect = function() {
  this.server.removeClient(this.socket); // Tell the server to disconnect him
};

Client.prototype.get = function(param) {
  return this[param];
};

Client.prototype.set = function(param, newVal) {
  if(this[param]) {
    this[param] = newVal;
    return true;
  }

  return false;
};

Client.prototype.updateColumn = function(col, val) {
  this.database.updateColumn(this.id, col, val);
};

module.exports = Client;
