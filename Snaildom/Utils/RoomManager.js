const rooms = require('../Crumbs/Rooms');
const npcs = require('../Crumbs/NPCs');

const utils = require(__dirname + '/Utils');
const logger = require(__dirname + '/Logger');

function RoomManager(server) {
  this.server = server;
  this.roomData = {};

  this.loadCrumbs();
  this.loadNPCs();
}

RoomManager.prototype.loadCrumbs = function() {
  for(var i in rooms) {
    this.roomData[i] = rooms[i];
    this.roomData[i]['users'] = [];
  }
};

RoomManager.prototype.loadNPCs = function() {
  for(var i in npcs) {
    var npc = npcs[i];

    for(var i in this.roomData) {
      var roomObj = this.roomData[i];

      if(roomObj.id == npc.room) {
        this.roomData[i].users.push(npc);
      }
    }
  }
};

RoomManager.prototype.roomExists = function(room) {
  var type = isNaN(room) ? 'name' : 'id',
      exists = false;

  if(type == 'id') {
    exists = this.roomData[room] ? true : false;
  } else {
    exists = this.getRoomByName(room) ? true : false;
  }

  return exists;
};

RoomManager.prototype.shellExists = function(room) {
  var type = isNaN(room) ? 'name' : 'id',
      exists = false;

  if(type == 'id') {
    exists = this.roomData[room] ? true : false;
  } else {
    exists = this.getRoomByRoomName(room) ? true : false;
  }

  return exists;
};

RoomManager.prototype.getRoom = function(room) {
  if(this.roomExists(room)) {
    return this.roomData[room];
  }
};

RoomManager.prototype.getRoomById = function(room) {
  var found = {};

  if(this.roomExists(room)) {
    for(var i in this.roomData) {
      var roomObj = this.roomData[i];

      if(roomObj.id == room) {
        found = roomObj;
      }
    }
  }

  return found;
};

RoomManager.prototype.getRoomByName = function(room) {
  var found = false;

  for(var i in this.roomData) {
    var roomObj = this.roomData[i];

    if(roomObj.id == room) {
      found = roomObj;
    }
  }

  return found;
};

RoomManager.prototype.getRoomByRoomName = function(room) {
  var found = false;

  for(var i in this.roomData) {
    var roomObj = this.roomData[i];

    if(roomObj.roomName == room) {
      found = roomObj;
    }
  }

  return found;
};

RoomManager.prototype.getRoomAliasById = function(room) {
  var roomObj = this.getRoomById(room);
  var roomAlias = roomObj.alias ? roomObj.alias : roomObj.name;
  return roomAlias;
};

RoomManager.prototype.getRoomString = function(room) {
  var roomString = {};

  if(this.roomExists(room)) {
    var roomObj = this.getRoom(room);

    if(roomObj) {
      var roomUsers = roomObj.users;

      for(var i in roomUsers) {
        var sclient = roomUsers[i];

        if(sclient) {
          if(sclient.dummy != 1) {
            roomString[sclient.id] = JSON.parse(sclient.buildPlayerJSON());
          } else {
            roomString[sclient.id] = sclient;
          }
        }
      }
    }
  }

  return roomString;
};

RoomManager.prototype.getNPCById = function(npc) {
  var found = false;

  for(var i in npcs) {
    var npcObj = npcs[i];

    if(npcObj.id == npc) {
      found = npcObj;
    }
  }

  return found;
};

RoomManager.prototype.createShell = function(user) {
  var shellId = Number(user.id) + Number(1000);

  var roomObj = {
    id: user.username + "'s Shell",
    name: user.username + "'s Shell",
    roomName: "shell_" + user.id,
    isGame: 0,
    isShell: 1,
    shell: {
      id: user.shellType,
      playerId: user.id,
      furniture: utils.getArtByCrumbs(user.shellArt)
    },
    internal: shellId,
    users: []
  };

	this.roomData[shellId] = roomObj;
};

RoomManager.prototype.addUser = function(room, client, coords) {
  var x = 0, y = 0;

  client.lastScore = client.score;
  client.score = 0;

  if(coords) {
    x = coords[0],
    y = coords[1];
  }


  if(room) {

    if(!room.startsWith("shell_")) {
      if(this.roomExists(room)) {
        var type = isNaN(room) ? 'name' : 'id';

        if(type == 'id') {
          var roomObj = Object.create(this.getRoom(room));
        } else {
          var roomObj = Object.create(this.getRoomByName(room));
        }

        this.roomData[roomObj.internal]['users'].push(client);

        roomObj.id = roomObj.id;

        if(roomObj.isGame == 1) {
          roomObj.isGame = 1;
        } else {
          roomObj.players = this.getRoomString(roomObj.internal);
        }

        roomObj.isShell = 0;
        roomObj.name = roomObj.name;
        delete roomObj.users;

        client.sendJSON({
          msg: "area",
          params: roomObj
        });

        this.sendJSON({
          msg: "addplayer",
          params: {
            player: client.buildPlayerJSON(true)
          }
        }, room);

        if(roomObj.id == 'damenball') {
          if(this.server.world.ball.score1 > 0 || this.server.world.ball.score2 > 0) {
            var t1 = this.server.world.ball.score1 ? this.server.world.ball.score1 : 0;
            var t2 = this.server.world.ball.score2 ? this.server.world.ball.score2 : 0;

            if(t1 > 0) {
              for(i = 0; i < Number(t1); i++) {
                client.sendJSON({
                  msg: "ballset",
                  params: {
                    x: this.server.world.ball.x,
                    y: this.server.world.ball.y,
                    score: 1
                  }
                });
              }
            }

            if(t2 > 0) {
              for(i = 0; i < Number(t2) + 1; i++) {
                client.sendJSON({
                  msg: "ballset",
                  params: {
                    x: this.server.world.ball.x,
                    y: this.server.world.ball.y,
                    score: 2
                  }
                });
              }
            }
          } else {
            client.sendJSON({
              msg: "ballset",
              params: {
                x: this.server.world.ball.x,
                y: this.server.world.ball.y
              }
            });
          }
        }

        if(client.room != -1) {
          this.removeUser(client);
        }

        client.x = x;
        client.y = y;
        client.lastRoom = client.room;
        client.room = roomObj.id;
      }
    } else {
      // Room is a shell

      if(!this.shellExists(room)) {
        var shellOwner = room.substring(6);

        this.server.database.getPlayer(shellOwner).then((player) => {
          this.createShell(player);
          this.addUser(room, client, coords);
        }).catch((err) => {
          room = "courtyard";
          this.addUser(room, client, coords);
          logger.error(err);

          return;
        });

      } else {
        var roomObj = Object.create(this.getRoomByRoomName(room));

        this.roomData[roomObj.internal]['users'].push(client);

        roomObj.id = roomObj.id;

        if(roomObj.isGame == 1) {
          roomObj.isGame = 1;
        }

        roomObj.isShell = 1;
        roomObj.name = roomObj.name;
        roomObj.shell = roomObj.shell;
        roomObj.furniture = roomObj.furniture;
        roomObj.players = this.getRoomString(roomObj.internal);
        delete roomObj.users;

        client.sendJSON({
          msg: "area",
          params: roomObj
        });

        this.sendJSON({
          msg: "addplayer",
          params: {
            player: client.buildPlayerJSON(true)
          }
        }, room);

        if(client.room != -1) {
          this.removeUser(client);
        }

        client.x = x;
        client.y = y;
        client.lastRoom = client.room;
        client.room = roomObj.id;
      }
    }
  }
};

RoomManager.prototype.removeUser = function(client, disconnect) {
  var room = client.room;

  if(this.roomExists(room)) {
    var type = isNaN(room) ? 'name' : 'id';
    var index = 0;

    if(type == 'id') {
      var roomObj = this.getRoom(room);
    } else {
      var roomObj = this.getRoomByName(room);
    }

    for(var i in roomObj.users) {
      var sclient = roomObj.users[i];

      if(sclient.id == client.id) {
        index = i;
        this.roomData[roomObj.internal]['users'].splice(index, 1);
      }
    }

    if(disconnect == false || !disconnect) {
      this.sendJSON({
          msg: "remove",
          params: {
            id: client.id
          }
      }, client.room);
    } else {
      this.sendJSON({
        msg: "remove",
        params: {
          id: client.id,
          logout: true
        }
      }, client.room);
    }
  }
};

RoomManager.prototype.sendJSON = function(json, room) {
  if(this.roomExists(room)) {
    var roomObj = this.getRoomByName(room);

    for(var i in roomObj.users) {
      var sclient = roomObj.users[i];

      if(sclient.dummy != 1) {
        sclient.sendJSON(json);
      }
    }
  } else {
    if(this.shellExists(room)) {
      var roomObj = this.getRoomByRoomName(room);

      for(var i in roomObj.users) {
        var sclient = roomObj.users[i];

        if(sclient.dummy != 1) {
          sclient.sendJSON(json);
        }
      }
    }
  }
};

RoomManager.prototype.getShells = function() {
  var clients = this.server.clients;
  var shells = [];

  for(var i in clients) {
    var client = clients[i];

    shells.push(client.buildPlayerJSON(true));
  }

  return shells;
};

module.exports = RoomManager;
