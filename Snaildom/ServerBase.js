const net = require('net');
const callerId = require('caller-id');

const logger = require(__dirname + '/Utils/Logger');
const utils = require(__dirname + '/Utils/Utils');
const encryption = require(__dirname + '/Utils/Encryption');

const World = require(__dirname + '/World');
const Client = require(__dirname + '/Client');

const Database = require(__dirname + '/Utils/DatabaseManager');
const RoomManager = require(__dirname + '/Utils/RoomManager');

function Server(serverConfig) {
  this.id = process.argv[2]; // Set server ID to the ID from console

  this.host = serverConfig.Host; // Set server IP to the IP from the config
  this.port = serverConfig.Port; // Set server port to the port from the config

  this.type = serverConfig.Type; // Set server type to the type from the config
  this.name = serverConfig.Name; // Set server name to the name from the config

  this.config = serverConfig;

  this.database = new Database();

  this.clients = []; // Create an array of connected clients
  this.maxClients = (serverConfig.maxClients ? serverConfig.maxClients : 100); // Set the maximum amount of clients that can connect to the server

  if(this.type == 'World') {
    // If the server is a World (Game) server

    this.world = new World(this); // Create a world for the server
    this.roomManager = new RoomManager(this);
  }

  this.start(); // Start the server
}

Server.prototype.start = function() {
  var serverType = this.type;
  var serverPort = this.port;

  net.createServer((socket) => {
    logger.write('A client has connected'); // Client (socket) has connected to the server

    socket.serverID = this.id; // Set a variable inside the socket object to the server ID, just incase for future reference
    
    var clientObj = new Client(socket, this); // Create the client (object)
    this.clients.push(clientObj);

    if(this.clients.length >= this.maxClients) {
      // Server is full

      clientObj.sendError(103, true);
    }

    socket.on('data', (data) => {
      // On receiving data from the client

      data = data.toString();

      var packetType = data.charAt(0); // Get the first character in the packet

  	  if(packetType == '<') {
        logger.write('Received: ' + data);

  	    this.world.handleXML(data, clientObj);
  	  } else if(packetType == '@') {
        this.world.handleData(data, clientObj);
      }
    });

    socket.on('end', () => {
      // On client's disconnection

      logger.write('A client has disconnected.');
      clientObj.disconnect(); // Removes the client's object & traces from the server
    });

    socket.on('error', (err) => {
      logger.error(err); // Logs the error
      clientObj.disconnect(); // Disconnects the client because the error probably fucked him up
    });

  }).listen(serverPort, () => {
    logger.write(serverType + ' server running on port ' + serverPort);
  });
};

Server.prototype.getClientById = function(id) {
  var found = false;

  for(var i in this.clients) {
    var sclient = this.clients[i]; // Select a client from the database
    if(sclient && sclient.id == id) {
      // If the client exists and the client's ID equals the ID we're searching for

      found = true; // Found that nibba
      return sclient;
    }
  }

  if(!found) {
    // Tell the retriever that the client wasn't found if it wasn't found

    return false;
  }
};

Server.prototype.getClientBySocket = function(socket) {
  for(var i in this.clients) {
    var sclient = this.clients[i]; // Select a client from connected clients

    if(sclient.socket == socket) {
      // If the selected client's socket equals the socket we want to delete

      return sclient; // Send the client back to the retriever
    }
  }
};

Server.prototype.delClientBySocket = function(socket) {
  for(var i in this.clients) {
    var sclient = this.clients[i]; // Select a client from connected clients

    if(sclient.socket == socket) {
      // If the selected client's socket equals the socket we want to delete

      this.clients.splice(i, 1); // Remove the client from the array
    }
  }
};

Server.prototype.removeClient = function(socket) {
  var sclient = this.getClientBySocket(socket); // Retrieve the client by his socket

  this.delClientBySocket(socket); // Remove the client from clients array
  logger.write('Removing client...');

  if(sclient) {
    this.roomManager.removeUser(sclient, true);
  }

  socket.destroy(); // Destroy the socket/connection
};

// Did you know that Rocket is actually a fucking nazi?

module.exports = Server;
