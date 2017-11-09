var parseXml = require('xml2js').parseString,
    libxmljs = require('libxmljs');

const logger = require(__dirname + '/Utils/Logger');
const config = require('../Config');

const utils = require(__dirname + '/Utils/Utils');
const encryption = require(__dirname + '/Utils/Encryption');

const PluginBase = require('../Plugins/PluginBase');
const HandlerBase = require(__dirname + '/Handlers/Base');

function World(server) {
  this.server = server; // Set the server to the proper server
  this.database = this.server.database; // Set the server database to the proper database connection

  this.pluginBase = new PluginBase(this);
  this.plugins = this.pluginBase.plugins;

  this.handlers = new HandlerBase(this.server);

  this.xmlHandlers = {
    'sys': {
			'verChk': 'handleVerChk',
			'rndK': 'handleRndK',
			'login': 'handleLogin'
	  }
   };

  this.jsonHandlers = {
    'login': 'handleWorldLogin',
    'move': 'handleMovePlayer',
    'warp': 'handleJoinRoom',
    'chat': 'handleSendMessage',
    'emote': 'handleSendEmote',
    'frame': 'handleSetFrame',
    'friend-request': 'handleFriendRequest',
    'accept-request': 'handleAcceptFriendRequest',
    'unfriend': 'handleRemoveFriend',
    'buy': 'handleBuyItem',
    'buyfurniture': 'handleBuyFurniture',
    'equip': 'handleEquipItem',
    'forge': 'handleForgeItem',
    'update-shell-art': 'handleUpdateShellArt',
    'find': 'handleFindPlayer',
    'talk': 'handleTalkToNPC',
    'response': 'handleGetNPCResponse',
    'ballpos': 'handleMoveBall',
    'thrust': 'handleSwordThrust',
    'warning': 'handleWarnPlayer',
    'kick': 'handleKickPlayer',
    'ban': 'handleBanPlayer'
  };

  this.ball = {
    x: 0,
    y: 0,
    score1: 0,
    score2: 0
  };

  this.damages = {
  	"sword": {
      "normalSword": [17, 26]
    }
  };

  this.creationDate = new Date("2017-11-09T18:51:06.845Z");
  this.days = Math.floor(this.creationDate/8.64e7) + 1;
}

World.prototype.handleXML = function (data, client) {
  data = data.toString();

  if (data == '<policy-file-request/>') {
    client.write('<cross-domain-policy><allow-access-from domain="*" to-ports="*" /></cross-domain-policy>'); // Allow the client to access our game
  } else {
    parseXml(data, (err, res) => {
      // Parse the XML
	     if(!res.hasOwnProperty('policy-file-request')) {
         var type = res.msg['$'].t, // Get the type of the packet from the parsed XML
          action = res.msg.body[0]['$'].action, // Get the action from the parsed XML
          method = this.xmlHandlers[type][action]; // Find the method inside our methods

         if (this[method] && typeof this[method] == 'function') {
           this[method](data, client); // Execute the handler and pass the data & client.
         } else {
           logger.warn('Unhandled XML packet received: ' + action);
         }
      } else {
        client.write('<cross-domain-policy><allow-access-from domain="*" to-ports="*" /></cross-domain-policy>');
      }
    });
  }
};

World.prototype.handleData = function (data, client) {
  data = data.split('@');
  data.shift();

  if(data[0] == 'DAT_START') {
    logger.write('Received: ' + data);

    var parsed = JSON.parse(data[1]),
        params = parsed.params,
        action = parsed.msg,
        handler = this.jsonHandlers[action];

    if(this[handler] && typeof this[handler] == 'function') {
      this[handler](params, client);
    } else {
      logger.write('Unhandled packet received: ' + action);
    }
  } else {
    data = encryption.decode(data[1], client.cipherKey);

    logger.write('Received: ' + data);

    data = data.split('@');
    data.shift();

    if(data[0] == 'ENC_START') {
      var parsed = JSON.parse(data[1]),
          params = parsed.params,
          action = parsed.msg,
          handler = this.jsonHandlers[action];

      if(this[handler] && typeof this[handler] == 'function') {
        this[handler](params, client);
      } else {
        var found = false;

  			for(var i in this.handlers) {
  				var _handler = this.handlers[i];

  				if(_handler.jsonHandlers) {
  					if(_handler.jsonHandlers[action]) {
              var method = _handler.jsonHandlers[action];

  						if(_handler[method] && typeof _handler[method] == 'function') {
  							_handler[method](params, client);
  							found = true;
  						}
  					}
  				}
  			}

        if(!found) {
          logger.write('Unhandled packet received: ' + action);
        }
      }
    }
  }
};

World.prototype.sendJSON = function(json) {
  var clients = this.server.clients;

  for(var i in clients) {
    var client = clients[i];

    client.sendJSON(json);
  }
};

World.prototype.handleWorldLogin = function(data, client) {
  var loginKey = data.playerkey;
  var cipherKey = data.playerkey2;

  this.server.database.getPlayerByLoginKey(loginKey).then((player) => {
    if(player) {

      // NOTE: Timed bans have NOT been tested, they're relying on the PHP login. I've been unable to test them because my MySQL timezone is ahead of my timezone so they never match in PHP.

      if(player.banned == 0 && player.dead == 0) {
        client.setClient(player);
        client.cipherKey = encryption.snailFeed(cipherKey);

        this.sendJSON({
          msg: "world",
          params: {
            era: {
              days: this.days,
              prefix: " &nbsp;&nbsp;&nbsp;",
              suffix: " Era",
              name: "Beta "
            },
            village: this.server.roomManager.getShells()
          }
        });

        client.refreshFriends();

        client.sendJSON({
          msg: "items",
          params: {
            items: utils.createItemCrumbs(),
            furniture: utils.createFurnitureCrumbs(),
            factions: utils.createFactionCrumbs()
          }
        });

        this.server.roomManager.addUser('library', client);

        var roomObj = this.server.roomManager.getRoomById(client.room);
        var roomAlias = roomObj.alias ? roomObj.alias : roomObj.name;

        for(var i in this.server.clients) {
          var sclient = this.server.clients[i];

          if(sclient.friendsWith(client.id)) {
            sclient.sendJSON({
              msg: "friend-online",
              params: {
                id: client.id,
                name: client.username,
                area: roomAlias
              }
            });
          }
        }
      } else {
        if(player.banned != 0) {
          if(player.banned != 999) {
            client.sendError("This account is banne for " + player.banned + " hours.", true);
          } else {
            client.sendError("This account is permanently banned.", true);
          }
        }

        if(player.dead == 1) {
          client.sendError("This snail is dead. Please make another one until this one is healed.", true);
        }
      }
    }
  });
};

World.prototype.handleMovePlayer = function(data, client) {
  var x = data.x,
      y = data.y;

  client.x = x;
  client.y = y;

  this.server.roomManager.sendJSON({
    msg: "move",
    params: {
      id: client.id,
      x: x,
      y: y
    }
  }, client.room);
};

World.prototype.handleJoinRoom = function(data, client) {
  var roomId = data.id;

  this.server.roomManager.addUser(roomId, client);
};

World.prototype.handleSendMessage = function(data, client) {
  var message = data.message;

  if(!utils.checkBadWords(message)) {
    var prefix = message.charAt(0);

    if(prefix == config.commandPrefix && this.plugins['Commands'] && this.plugins['Commands'].plugin.commandExists(message.substr(1).split(' ')[0])) {
      var params = message.substr(1).split(' ');
      var command = params[0];

      this.plugins['Commands'].plugin.handleCommand(command, params, client);
    } else {
      this.server.roomManager.sendJSON({
        msg: "chat",
        params: {
          id: client.id,
          message: message
        }
      }, client.room);
    }
  } else {
    if(client.kickCount >= 3) {
      client.ban('You have exceeded the maximum kick count. You have been banned for breaking the rules.', client.kickCount * 8);
    } else {
      client.kick('Swearing/Cussing.');
    }
  }
};

World.prototype.handleSendEmote = function(data, client) {
  var emote = data.emote;

  this.server.roomManager.sendJSON({
    msg: "emote",
    params: {
      id: client.id,
      emote: emote
    }
  }, client.room);
};

World.prototype.handleSetFrame = function(data, client) {
  var frame = data.frame;
  var falseCallback = data.falseCallback;

  client.frame = frame;

  this.server.roomManager.sendJSON({
    msg: "frame",
    params: {
      id: client.id,
      frame: frame
    }
  }, client.room);
};

World.prototype.handleFriendRequest = function(data, client) {
  var userId = data.id;
  var myFriends = client.getFriendsArray();

  if(myFriends.indexOf(userId) == -1) {
    var sclient = this.server.getClientById(userId);

    if(sclient) {
      sclient.sendJSON({
        msg: "friend-request",
        params: {
          id: client.id,
          name: client.username
        }
      });
    }
  }
};

World.prototype.handleAcceptFriendRequest = function(data, client) {
  var userId = String(data.id);
  var myFriends = client.getFriendsArray();

  if(userId != String(client.id)) {
    if(myFriends.indexOf(userId) == -1) {
      this.database.getPlayer(userId).then((player) => {
        if(player) {
          var sclient = this.server.getClientById(userId);

          var myFriendArr = client.friends;
          var myFriendStr = client.id + '|' + client.username;

          var hisFriendArr = player.friends.split(',');
          var hisFriendStr = player.id + '|' + player.username;

          if(hisFriendArr.indexOf(myFriendStr) == -1) {
            hisFriendArr.push(myFriendStr);
            this.database.updateColumn(userId, "friends", hisFriendArr.join(','));
          }

          if(myFriendArr.indexOf(hisFriendArr) == -1) {
            myFriendArr.push(hisFriendStr);
            myFriendArr = _.uniq(myFriendArr, false);
            this.database.updateColumn(client.id, "friends", myFriendArr.join(','));
          }

          if(client.friends.indexOf(hisFriendStr) == -1) {
            client.friends.push(hisFriendStr);
          }

          client.sendJSON({
            msg: "accept-request",
            params: {
              id: player.id,
              name: player.username
            }
          });

          client.refreshFriends();

          if(sclient) {
            sclient.friends.push(myFriendArr);

            sclient.sendJSON({
              msg: "accept-request",
              params: {
                id: client.id,
                name: client.username
              }
            });

            sclient.refreshFriends();
          }
        }
      }).catch((err) => {
        logger.error(err);
      });
    }
  }
};

World.prototype.handleRemoveFriend = function(data, client) {
  var userId = String(data.id);
  var myFriends = client.getFriendsArray();

  if(_.contains(myFriends, userId)) {
    this.database.getPlayer(userId).then((player) => {
      var sclient = this.server.getClientById(userId);

      var myFriendArr = client.friends;
      var myFriendStr = client.id + '|' + client.username;

      var hisFriendArr = player.friends.split(',');
      var hisFriendStr = player.id + '|' + player.username;

      if(myFriendArr.indexOf(hisFriendStr) > -1) {
        myFriendArr.splice(myFriendArr.indexOf(hisFriendStr), 1);
        this.database.updateColumn(client.id, "friends", myFriendArr.join(','));
      }

      if(hisFriendArr.indexOf(myFriendStr) > -1) {
        hisFriendArr.splice(myFriendArr.indexOf(myFriendStr), 1);
        this.database.updateColumn(userId, "friends", hisFriendArr.join(','));
      }

      client.sendJSON({
        msg: "delete-friend",
        params: {
          id: player.id,
          name: player.username
        }
      });

      client.refreshFriends();

      if(sclient) {
        sclient.sendJSON({
          msg: "delete-friend",
          params: {
            id: client.id,
            name: client.username
          }
        });

        sclient.refreshFriends();
      }
    }).catch((err) => {
      logger.error(err);
    });
  }
};

World.prototype.handleBuyItem = function(data, client) {
  var itemId = data.id;
  var itemObj = utils.getItemCrumbById(itemId);

  if(itemObj) {
    var itemPrice = Number(itemObj.cost);
    var myGold = Number(client.gold);

    if(myGold >= itemPrice) {
      var newGold = myGold - itemPrice;

      if(newGold >= 0) {
        client.delGold(itemPrice);

        var myInventory = client.inventory;
        myInventory.push(itemObj.identifier);
        client.updateColumn("inventory", myInventory.join(','))

        client.sendJSON({
          msg: "itemadd",
          params: {
            id: itemObj.identifier,
            notify: true
          }
        });
      }
    } else {
      client.sendError("You don't have enough gold");
    }
  }
};

World.prototype.handleEquipItem = function(data, client) {
  var itemId = data.id;
  var itemObj = utils.getItemCrumbById(itemId);

  if(itemObj) {
    if(client.hasItem(itemObj.identifier)) {
      if(itemObj.identifier == client[itemObj.type]) {
        client[itemObj.type] = "";
        client.updateColumn(itemObj.type, '');
      } else {
        client[itemObj.type] = itemObj.identifier;
        client.updateColumn(itemObj.type, itemObj.identifier);
      }

      this.server.roomManager.sendJSON({
        msg: "equip",
        params: {
          id: client.id,
          item: itemObj.identifier
        }
      }, client.room);
    }
  }
};

World.prototype.handleBuyFurniture = function(data, client) {
  var itemId = data.id;
  var itemObj = utils.getFurnitureCrumbById(itemId);

  if(itemObj) {
    var itemPrice = Number(itemObj.cost);
    var myGold = Number(client.gold);

    if(myGold >= itemPrice) {
      var newGold = myGold - itemPrice;

      if(newGold >= 0) {
        client.delGold(itemPrice);

        var myFurniture = client.furniture;
        myFurniture.push(itemObj.identifier);

        client.updateColumn("furniture", myFurniture.join(','))

        client.sendJSON({
          msg: "furnitureadd",
          params: {
            id: itemObj.identifier,
            notify: true
          }
        });
      }
    } else {
      client.sendError("You don't have enough gold.");
    }
  }
};

World.prototype.handleUpdateShellArt = function(data, client) {
  var newShellArt = data.shellArt;

  client.setShellArt(newShellArt);
};

World.prototype.handleFindPlayer = function(data, client) {
  var userId = data.id;
  var userName = data.name;

  var sclient = this.server.getClientById(userId);

  if(sclient) {
    client.alert(sclient.username + ' is at ' + this.server.roomManager.getRoomAliasById(client.room) + '.');
  } else {
    client.alert('Oh no! The snail you tried to find is offline.');
  }
};

World.prototype.handleTalkToNPC = function(data, client) {
  var npcId = data.id;
  var npcObj = this.server.roomManager.getNPCById(npcId);

  if(npcObj && npcObj.dialogue && npcObj.dialogue.message) {
    client.sendJSON({
      msg: "talk",
      params: {
        player: npcObj,
        dialogue: npcObj.dialogue
      }
    });
  }
};

World.prototype.handleGetNPCResponse = function(data, client) {
  var topicId = data.topic;
  var topicObj = utils.getTopicById(topicId, client);

  if(topicObj) {
    var npcId = topicObj.npc;
    var npcObj = this.server.roomManager.getNPCById(npcId);

    if(npcObj) {
      client.sendJSON({
        msg: "response",
        params: {
          player: npcObj,
          dialogue: topicObj
        }
      });
    }
  }
};

World.prototype.handleMoveBall = function(data, client) {
  var x = data.x,
      y = data.y;

  if(client.room == 'damenball') {
    this.ball.x = x;
    this.ball.y = y;

    this.server.roomManager.sendJSON({
      msg: "ballpos",
      params: {
        id: client.id,
        x: x,
        y: y
      }
    }, client.room);
  }
};

World.prototype.handleForgeItem = function(data, client) {
  var itemId = data.id;
  var itemObj = utils.getItemCrumbById(itemId);

  if(itemObj) {
    if(client.gold >= itemObj.cost) {
      var notEnough = [];

      if(client.ore.iron < itemObj.forge.iron) {
        notEnough.push('iron');
      }

      if(client.ore.silver < itemObj.forge.silver) {
        notEnough.push('silver');
      }

      if(client.ore.gold < itemObj.forge.gold) {
        notEnough.push('gold');
      }

      if(notEnough.length > 0) {
        var oreStr = [];

        for(var i in notEnough) {
          var oreName = notEnough[i];
          oreStr.push(oreName);
        }

        oreStr = utils.arrayToSentence(oreStr);

        client.sendError("You don't have enough " + oreStr + " to forge this item.");
        return;
      } else {
        client.delGold(itemObj.cost);

        var ores = [];

        for(var i in itemObj.forge) {
          var matVal = itemObj.forge[i];

          if(matVal > 0) {
            client.removeMaterial(i, matVal);
          }
        }

        var myInventory = client.inventory;
        myInventory.push(itemObj.identifier);
        client.updateColumn("inventory", myInventory.join(','));

        client.sendJSON({
          msg: "itemadd",
          params: {
            id: itemObj.identifier,
            notify: true
          }
        });

        client.alert("You have successfully forged a " + itemObj.name + ".");
      }
    } else {
      client.sendError("You don't have enough gold to forge this item.");
    }
  }
};

World.prototype.handleSwordThrust = function(data, client) {
  var victims = data.victims;

  if(client.hasSword == 1 || client.hasSword == true) {
    for(var i in victims) {
      if(victims[i] == client.id) {
        victims.splice(i, 1);
      } else {
        var sclient = this.server.getClientById(victims[i]);

        if(sclient) {
          if(sclient.room == client.room) {
            if(this.damages['sword'][client.swordToy]) {
              var damage = this.damages['sword'][client.swordToy];
            	damage = Math.floor(Math.random() * damage[1]) + damage[0];
            } else {
              damage = 21;
            }

            sclient.health -= Number(damage);

            if(sclient.health <= 0) {
              sclient.health = 0;
              sclient.dead = true;
            }

            logger.write(client.id + '|' + client.username + " has damaged " + sclient.id + "|" + sclient.username + " and his health is now " + sclient.health + ".");

            if(sclient.health <= 0) {
              sclient.die();
            }
          } else {
            logger.write(client.id + '|' + client.username + " has attempted to exploit the game by damaging a player that isn't in the same room as him. What a retard!");
          }
        }
      }
    }

    this.server.roomManager.sendJSON({
      msg: "thrust",
      params: {
        id: client.id
      }
    }, client.room);
  } else {
    logger.write(client.id + '|' + client.username + " has attempted to exploit the game by damaging a player when he doesn't have a sword. What a retard!");
  }
};

/*

@everyone @everyone I'm sorry I had to send this to you but now that you have opened it you can't stopped reading this. Hi my name is Teresa Fidalgo I died 27 years. If you don't send this to 20 people I will sleep by your side forever. If you don't believe me search me up. Teresa Fidalgo. So send this to 20 people. A girl ignored this and her mom died 20 days later. NO SEND BACKS!!!!!#copied sorry to send this. Btw this is not fake search her up on google (not riskingWARNING! Carry on reading! Or you will die, even if you only looked at the word warning! Once there was a little girl called Clarissa, she was ten-years-old and she lived in a mental hospital, because she killed her mom and her dad. She got so bad she went to kill all the staff in the hospital so the More- government decided that best idea was to get rid of her so they set up a special room to kill her, as humane as possible but it went wrong the machine they were using went wrong. And she sat there in agony for hours until she died. Now every week on the day of her death she returns to the person that reads this letter, on a monday night at 12:00a.m. She creeps into your room and kills you slowly, by cutting you and watching you bleed to death. Now send this to ten other discors, and she will haunt someone else who doesn't. This isn't fake. apparently, if u copy and paste this to ten discords in the next ten minutes u will have the best day of ur life tomorrow. u will either get kissed or asked out, if u break this chain u will see a little dead girl in your room tonight. in 53 mins someone will say i love you or im sorry

*/

World.prototype.handleWarnPlayer = function(data, client) {
  var reason = data.warning,
      player = data.id;

  if(client.rank >= 2) {
    var sclient = this.server.getClientById(player);

    if(sclient) {
      if(sclient.rank >= client.rank) {
        logger.write(client.id + '|' + client.username + ' tried to warn a user who has a higher rank than himself.');
      } else {
        sclient.warn(reason);

        // Hey! Add modlogs man.

        logger.write(client.id + '|' + client.username + ' has warned ' + sclient.id + '|' + sclient.username + '.');
      }
    }
  } else {
    logger.write(client.id + '|' + client.username + ' has attempted to warn a user without moderator permissions. What a retard lolz');
  }
};

World.prototype.handleKickPlayer = function(data, client) {
  var reason = data.reason,
      player = data.id;

  // I didn't copy this from the warning handling, I promise!

  if(client.rank >= 2) {
    var sclient = this.server.getClientById(player);

    if(sclient) {
      if(sclient.rank >= client.rank) {
        logger.write(client.id + '|' + client.username + ' tried to kick a user who has a higher rank than himself.');
      } else {
        sclient.kick(reason);

        logger.write(client.id + '|' + client.username + ' has kicked ' + sclient.id + '|' + sclient.username + '.');
      }
    }
  } else {
    logger.write(client.id + '|' + client.username + ' has attempted to kick a user without moderator permissions. What a retard lolz');
  }
};

World.prototype.handleBanPlayer = function(data, client) {
  var reason = data.reason,
      player = data.id,
      hours = data.duration;

  // I didn't copy this from the warning handling, I promise!

  if(hours == 0 || !hours) {
    hours = 999;
  }

  if(client.rank >= 2) {
    var sclient = this.server.getClientById(player);

    if(sclient) {
      if(sclient.rank >= client.rank) {
        logger.write(client.id + '|' + client.username + ' tried to ban a user who has a higher rank than himself.');
      } else {
        sclient.ban(reason, hours);

        logger.write(client.id + '|' + client.username + ' has banned ' + sclient.id + '|' + sclient.username + '.');
      }
    }
  } else {
    logger.write(client.id + '|' + client.username + ' has attempted to ban a user without moderator permissions. What a retard lolz');
  }
};

World.prototype.sendStaff = function(json) {
  var clients = this.server.clients;

  for(var i in clients) {
    var client = clients[i];

    if(client.rank >= 2) {
      client.sendJSON(json);
    }
  }
};

module.exports = World;
