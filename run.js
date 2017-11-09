const logger = require(__dirname + '/Snaildom/Utils/Logger');
const Server = require(__dirname + '/Snaildom/ServerBase');

const version = require(__dirname + '/package').version;

const config = require('./Config').Servers;

console.log('Snaildom ' + version + ' - An emulator for Damen\'s amazing Snaildom.\n');

var serverID = process.argv[2];
var serverConfig = config[serverID];

if(serverConfig) {
	new Server(serverConfig);
} else {
	logger.write('Server not found. Please check your configuration.'); // Server doesn't exist
}
