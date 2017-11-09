const logger = require(__dirname + '/Logger');
const config = require('../../Config');

const SyncSQL = require('sync-mysql');

var serverID = process.argv[2];
var dbConfig = config.Database;

function Database() {
  // Connect to the database

  this.knex = require('knex')({
    client: dbConfig.Client.toLowerCase(),
    connection: {
      'host': dbConfig.Host,
      'user': dbConfig.User,
      'password': dbConfig.Password,
      'database': dbConfig.Database
    }
  });

  // Having two DB connections is retarded but I needed syncronous connection because async was impractical in a few situations

  var sync = function () {
    var conn = new SyncSQL({
      host: dbConfig.Host,
      user: dbConfig.User,
      password: dbConfig.Password,
      database: dbConfig.Database
    });

    this.conn = conn;
    return this;
  };

  sync.prototype.getPlayer = function(player) {
    var type = isNaN(player) ? 'username' : 'id';

    var result = this.conn.query("SELECT * FROM users WHERE `" + type + "` = '" + player + "'");
    return result;
  };

  this.sync = new sync();

  return this; // Return the connection to the server
}



Database.prototype.getPlayer = function(player) {
  var type = isNaN(player) ? 'username' : 'id'; // Check if "player" is an integer (ID) or non-integer (username)

  return this.knex('users').first('*').where(type, player); // Complex stuff. Use our query manager (Knex) to get the player from the "users" table
};

Database.prototype.getPlayerByLoginKey = function(loginKey) {
  return this.knex('users').first('*').where('loginKey', loginKey); // Complex stuff. Use our query manager (Knex) to get the player from the "users" table
};

Database.prototype.verifyPlayer = function (player, callback) {
  var type = isNaN(player) ? 'username' : 'id';

  this.knex('users').first('*').where(type, player).then((player) => {
    if(callback && typeof callback == 'function') {
      callback(player.id);
    }
  }).catch((err) => {
      // If there was an error with our DB query

      logger.error(err);
  });
};

Database.prototype.updateColumn = function(user, column, value) {
  var userType = isNaN(user) ? 'username' : 'id'; // Check if "player" is an integer (ID) or non-integer (username)

  return this.knex('users').update(column, value).where(userType, user).then(() => {
  }).catch((err) => {
    logger.error(err); // Log the error
  });
};

module.exports = Database;
