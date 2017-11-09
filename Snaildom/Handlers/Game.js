function Handler(base) {
  this.base = base;
  this.server = base.server.server;

	this.world = base.server;
	this.database = base.database;

  this.jsonHandlers = {
    'joinmg': 'handleJoinMultiplayerGame',
    'gameupdate': 'handleUpdateGame',
    'leavemg': 'handleLeaveGame'
  };

  this.games = {};

  this.def = {
    "connectfour": {
      "name": "Connect Four",

      "1": {
        "started": false,
        "turn": 0,
        "board": [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ],
        "players": [],
        "spectators": []
      },
      "2": {
        "started": false,
        "turn": 0,
        "board": [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ],
        "players": [],
        "spectators": []
      },
      "3": {
        "started": false,
        "turn": 0,
        "board": [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ],
        "players": [],
        "spectators": []
      }
    }
  };

  this.loadGames();
};

Handler.prototype.loadGames = function() {
  this.games = JSON.parse(JSON.stringify(this.def)); // Clone the object
};

Handler.prototype.gameExists = function(id) {
  return this.games[id] ? true : false;
};

Handler.prototype.tableExists = function(tableId, gameId) {
  var found = false;

  if(this.gameExists(gameId)) {
    found = this.games[gameId][tableId] ? true : false;
  }

  return found;
};

Handler.prototype.getGameString = function(gameId, tableId) {
  var gameString = [];

  if(this.gameExists(gameId)) {
    if(this.tableExists(tableId, gameId)) {
      var gameObj = this.games[gameId][tableId];

      if(gameObj) {
        var gamePlayers = gameObj.players;

        for(var i in gamePlayers) {
          var sclient = gamePlayers[i];

          if(sclient) {
            if(sclient.dummy != 1) {
              gameString.push(JSON.parse(sclient.buildPlayerJSON()));
            } else {
              gameString.push(sclient);
            }
          }
        }
      }
    }
  }

  return gameString;
};

Handler.prototype.resetGame = function(gameId) {
  var defGame = this.def[gameId];
  this.games[gameId] = defGame;
};

Handler.prototype.resetTable = function(tableId, gameId) {
  var defTable = this.def[gameId][1];

  console.log(defTable);

  this.games[gameId][tableId] = defTable;
};

Handler.prototype.sendJSON = function(json, gameId, tableId, ignoredClient) {
  if(this.gameExists(gameId)) {
    if(this.tableExists(tableId, gameId)) {
      var gameObj = this.games[gameId][tableId];

      for(var i in gameObj.players) {
        var sclient = gameObj.players[i];

        if(sclient.dummy != 1 && (!ignoredClient || (ignoredClient && ignoredClient != sclient))) {
          sclient.sendJSON(json);
        }
      }
    }
  }
};

Handler.prototype.handleJoinMultiplayerGame = function(data, client) {
  var gameId = data.name;

  client.spectator = false;

  if(this.gameExists(gameId)) {
    if(gameId == "connectfour") {
      var tableId = data.group + 1;

      if(this.tableExists(tableId, gameId)) {
        var gameObj = this.games[gameId][tableId];

        client.game = gameId;
        client.tableId = tableId;

        if(gameObj.started == false) {
          if(gameObj.players.length < 2) {
            this.games[gameId][tableId].players.push(client);
          } else {
            this.games[gameId][tableId].spectators.push(client);
            client.spectator = true;
          }
        } else {
          this.games[gameId][tableId].spectators.push(client);
          client.spectator = true;
        }

        if(this.games[gameId][tableId].players.length == 2) {
          this.games[gameId][tableId].started = true;
        }

        if(client.spectator == false) {
          client.sendJSON({
            msg: "multigame",
            params: {
              id: gameId,
              name: this.games[gameId].name,
              players: this.getGameString(gameId, tableId)
            }
          });

          this.sendJSON({
            msg: "mgupdate",
            params: {
              action: "join",
              player: client.buildPlayerJSON(true)
            }
          }, gameId, tableId, client);
        } else {
          client.sendJSON({
            msg: "multigame",
            params: {
              id: gameId,
              name: this.games[gameId].name,
              players: this.getGameString(gameId, tableId),
              turn: this.games[gameId][tableId].turn
            }
          });
        }
      }
    }
  }
};

Handler.prototype.handleUpdateGame = function(data, client) {
  var gameType = String(client.room);
  var allowedGameTypes = ['railandcart', 'marksman', 'snaildrop', 'connectfour'];

  if(allowedGameTypes.indexOf(gameType) == -1) {
    gameType = client.game;
  }

  if(allowedGameTypes.indexOf(gameType) > -1) {
    if(gameType == 'marksman') {
      var action = data.action;
      var victim = data.id;

      if(action == 'hit') {
        var score = 10;

        switch(victim) {
          case "target2":
            score = 15;
            break;
          default:
            score = 10;
        }

        client.score += score;
      } else if(action == 'leave') {
        var earnedGold = client.score * 0.5;

        client.score = 0;

        client.addGold(earnedGold);
        this.server.roomManager.addUser(client.lastRoom, client);
      }
    } else if(gameType == 'railandcart') {
      var action = data.action;

      if(action != 'reset') {
        if(action == 'mine') {
          var type = data.type;

          switch(data.type) {
            case "rock":
              client.score += 10;
              break;
            case "iron":
              client.addMaterial("iron");
              break;
            case "silver":
              client.addMaterial("silver");
              break;
            case "gold":
              client.addMaterial("gold");
          }
        } else if(action == 'cart') {
          client.score += 15;
        } else if(action == 'leave') {
          var earnedGold = client.score / 2;

          client.score = 0;

          client.addGold(earnedGold);
          this.server.roomManager.addUser(client.lastRoom, client);
        }
      } else {
        if(client.lastOreRefresh - new Date().getTime() > 1000) {
          //client.updateOres();
        }
      }
    } else if(gameType == 'snaildrop') {
      var action = data.action;

      if(action == 'retrylevel') {
        var score = Number(data.score);

        if(score >= 5) {
          client.score += score;
        }
      } else if(action == 'leave') {
        var earnedGold = client.score * 7;

        client.score = 0;

        client.addGold(earnedGold);
        this.server.roomManager.addUser(client.lastRoom, client);
      }
    } else if(gameType == 'connectfour') {
      var action = data.action,
          tableId = client.tableId;

      if(this.tableExists(tableId, gameType)) {
        if(action == 'ready') {
          this.games[gameType][tableId].started = true;
          this.games[gameType][tableId].turn = 1;

          var gameObj = this.games[gameType][tableId];

          this.sendJSON({
            msg: "mgupdate",
            params: {
              action: "begin",
              turn: this.games[gameType][tableId].turn
            }
          }, gameType, tableId);
        } else if(action == 'place') {
          var rowId = data.row;
          var myPlayerId = this.games[gameType][tableId].players.indexOf(client) + 1;

          this.placeChip(rowId, gameType, tableId, myPlayerId);

          if(!this.checkWin(gameType, tableId)) {
            this.sendJSON({
              msg: "mgupdate",
              params: {
                action: "place",
                row: rowId
              }
            }, gameType, tableId, client);
          } else {
            this.sendWin(gameType, tableId, rowId);
          }
        }
      }
    }
  }
};

Handler.prototype.placeChip = function(row, gameId, tableId, playerId) {
  var rowIndex = row - 1;
  var placed = false;

  if(this.gameExists(gameId)) {
    if(this.tableExists(tableId, gameId)) {
      for(var i in this.games[gameId][tableId].board) {
        if(placed == false) {
          var rowArr = this.games[gameId][tableId].board[i];
          if(rowArr[rowIndex] == 0) {
            this.games[gameId][tableId].board[i][rowIndex] = playerId;
            placed = true;
          }
        }
      }
    }
  }
};

Handler.prototype.checkWin = function(gameId, tableId) {
  var gameWon = false;

  if(this.gameExists(gameId)) {
    if(this.tableExists(tableId, gameId)) {
      var gameObj = this.games[gameId][tableId];

      if(gameObj) {
        var verticalWinner = this.determineVerticalWin(gameId, tableId);

        if(verticalWinner !== false) {
          gameWon = true;
          this.win(gameId, tableId, verticalWinner);
        }

        if(gameWon == false) {
          var horizontalWinner = this.determineHorizontalWin(gameId, tableId);

          if(horizontalWinner !== false) {
            gameWon = true;
            this.win(gameId, tableId, horizontalWinner);
          }

          if(gameWon == false) {
            var diagonalWinner = this.determineDiagonalWin(gameId, tableId);

            if(diagonalWinner !== false) {
              gameWon = true;
              this.win(gameId, tableId, diagonalWinner);
            }
          }
        }
      }
    }
  }

  return gameWon;
};

Handler.prototype.determineColumnWin = function(column, gameId, tableId) {
  if(this.gameExists(gameId)) {
    if(this.tableExists(tableId, gameId)) {
      var gameObj = this.games[gameId][tableId];

      var currentPlayer = gameObj.players[gameObj.turn - 1];
      var currentPlayerId = gameObj.turn;

      var streak = 0;

      for(var row of gameObj.board){
        if(row[column] == currentPlayerId){
          ++streak;

          if(streak === 4){
            return currentPlayerId;
          }
        } else {
          streak = 0;
        }
      }

      return false;
    }
  }
};

Handler.prototype.determineVerticalWin = function(gameId, tableId) {
  if(this.gameExists(gameId)) {
    if(this.tableExists(tableId, gameId)) {
      var gameObj = this.games[gameId][tableId];

      var rows = gameObj.board.length;

      for(var column = 0; column < rows; column++) {
        var result = this.determineColumnWin(column, gameId, tableId);

        if(result !== false) {
          return result;
        }
      }

      return false;
    }
  }
};

Handler.prototype.determineHorizontalWin = function(gameId, tableId) {
  if(this.gameExists(gameId)) {
    if(this.tableExists(tableId, gameId)) {
      var gameObj = this.games[gameId][tableId];
      var rows = gameObj.board.length;

      var currentPlayer = gameObj.players[gameObj.turn - 1];
      var currentPlayerId = gameObj.turn;

      var streak = 0;

      for(var row = 0; row < rows; row++) {
        var columns = gameObj.board[row].length;

        for(var column = 0; column < columns; column++) {
          if(gameObj.board[row][column] === currentPlayerId) {
            ++streak;

            if(streak === 4) {
              return currentPlayerId;
            }
          } else {
            streak = 0;
          }
        }
      }

      return false;
    }
  }
};

Handler.prototype.determineDiagonalWin = function(gameId, tableId) {
  if(this.gameExists(gameId)) {
    if(this.tableExists(tableId, gameId)) {
      var gameObj = this.games[gameId][tableId];
      var currentPlayer = gameObj.players[gameObj.turn - 1];
      var currentPlayerId = gameObj.turn;

      var rows = gameObj.board.length;

      var streak = 0;

      for(var row = 0; row < rows; row++) {
        var columns = gameObj.board[row].length;

        for(var column = 0; column < columns; column++) {
          if(gameObj.board[row][column] === currentPlayerId) {
            if(gameObj.board[row + 1] && gameObj.board[row + 1][column + 1] === currentPlayerId &&
               gameObj.board[row + 2] && gameObj.board[row + 2][column + 2] === currentPlayerId &&
               gameObj.board[row + 3] && gameObj.board[row + 3][column + 3] === currentPlayerId) {
              return currentPlayerId;
            }

            if(gameObj.board[row - 1] && gameObj.board[row - 1][column - 1] === currentPlayerId &&
               gameObj.board[row - 2] && gameObj.board[row - 2][column - 2] === currentPlayerId &&
               gameObj.board[row - 3] && gameObj.board[row - 3][column - 3] === currentPlayerId) {
              return currentPlayerId;
            }

            if(gameObj.board[row - 1] && gameObj.board[row - 1][column + 1] === currentPlayerId &&
               gameObj.board[row - 2] && gameObj.board[row - 2][column + 2] === currentPlayerId &&
               gameObj.board[row - 3] && gameObj.board[row - 3][column + 3] === currentPlayerId) {
              return currentPlayerId;
            }
          }
        }
      }

      return false;
    }
  }
};

Handler.prototype.win = function(gameId, tableId, winnerPlayer) {
  if(this.gameExists(gameId)) {
    if(this.tableExists(tableId, gameId)) {
      var winnerPlayerIndex = winnerPlayerIndex - 1;

      this.games[gameId][tableId].winner = winnerPlayer;
    }
  }
};

Handler.prototype.sendWin = function(gameId, tableId, rowId) {
  if(this.gameExists(gameId)) {
    if(this.tableExists(tableId, gameId)) {
      var gameObj = this.games[gameId][tableId];

      if(gameObj) {
        if(gameObj.winner) {
          this.sendJSON({
            msg: "mgupdate",
            params: {
              action: "win",
              turn: gameObj.winner,
              row: rowId
            }
          }, gameId, tableId);

          var winnerIndex = gameObj.winner - 1;

          for(var i in gameObj.players) {
            var player = gameObj.players[i];

            if(i == winnerIndex) {
              player.addGold(10);
            } else {
              player.addGold(5);
            }
          }

          this.resetTable(tableId, gameId);
        }
      }
    }
  }
};

Handler.prototype.handleLeaveGame = function(data, client) {
  var gameId = client.game;
  var tableId = client.tableId;

  if(this.gameExists(gameId)) {
    if(gameId == 'connectfour') {
      if(this.tableExists(tableId, gameId)) {
        var gameObj = this.games[gameId][tableId];

        for(var i in gameObj.players) {
          var player = gameObj.players[i];

          if(player && player.id != client.id) {
            player.addGold(5);
          }
        }

        this.sendJSON({
          msg: "mgupdate",
          params: {
            action: "leave",
            player: client.buildPlayerJSON(true)
          }
        }, gameId, tableId, client);
      }
    }
  }

  client.tableId = 0;
  client.game = null;
};

module.exports = Handler;
