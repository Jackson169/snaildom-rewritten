const fs = require('fs');
const logger = require('../Snaildom/Utils/Logger');

var pluginDir = __dirname + '/';

function PluginBase(server) {
  this.server = server.server;
  this.world = server;

  this.database = server.server.database;
  this.plugins = {};

  this.loadPlugins();

  return this;
}

PluginBase.prototype.loadPlugins = function() {
	var files = fs.readdirSync(pluginDir);

	files.forEach((file) => {
		if(file != 'PluginBase.js') {
			var packagePath = pluginDir + file + '/package.json'
			var mainPath = pluginDir + file + '/main.js';

			if(fs.existsSync(packagePath) && fs.existsSync(mainPath)) {
				var package = fs.readFileSync(packagePath, 'utf8');
				var jsonPackage = jf(package);

        var pluginClass = require(pluginDir + file + '/main.js')

				if(jsonPackage) {
          try {
  				  var plugin = {
  					  plugin: new pluginClass(this),
  					  package: jsonPackage
  					};
          }
          catch(err) {
            logger.error(err);

            var plugin = {
              plugin: pluginClass,
              package: jsonPackage
            };

            if(pluginClass.init && typeof pluginClass.init == 'function') {
              pluginClass.init(this);
            }
          }

					if(jsonPackage.name) {
						this.plugins[jsonPackage.name] = plugin;
					} else {
						this.plugins[file] = plugin;
					}

					var pluginName = jsonPackage.name ? jsonPackage.name : file;
					logger.write('Loaded plugin ' + pluginName + '.');
				}
			}
		}
	});
};

function jf(str) {
    try {
        var jsonOBJ = JSON.parse(str);
    } catch (e) {
        return false;
    }
    return jsonOBJ;
}

function isConstructor(c) {
  try {
    new c();
  } catch (err) {
    return false;
  }

  return true;
}

module.exports = PluginBase;
