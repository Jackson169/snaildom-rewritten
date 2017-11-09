global._ = require('underscore');

const itemCrumbs = require('../Crumbs/Items');
const furnitureCrumbs = require('../Crumbs/Furniture');
const topics = require('../Crumbs/Topics');
const factions = require('../Crumbs/Factions');

module.exports = {
	JSON: require('circular-json'),

	badWords: ["fuck", "shit", "bastard", "nigger", "penis", "sex", "vagina", "dickhead", "dick", "sperm", "porn", "pubes", "asshole", "faggot", "cunt", "f!ck", "f@ck", "f*ck", "f**k", "f**ck", "fuggot", "bitch", "fruck", "phuck", "f***", "f****", "sh*t", "shlt", "b1tch", "wank", "cock", "cocck", "faggert", "faggort", "fagot", "foggert", "fag3rt", "ƒuck", "prava", "c.unt", "cu.nt", "cun.t", "f.aggot", "fa.ggot", "fag.got", "fagg.ot", "faggo.t", "f.uck", "fu.ck", "fuc.k", "f.ck", "fc.k", "fck", "fuk", "peni$", "p3n1s", "p0rn", "fock", "gay", "$hit", "a$$hole", "nigga", "pu$sy", "pu$y", "pu$$y", "sxy", "erection", "$ex", "$ecks", "secks", "seks", "dck", "ffsiuhfdskjfneiuh", "fuc", "condom", "pussy", "piss", "fuuck", "fuuuck", "fuuuuuuuuck", "d!ck", "mudda&nbsp;fooker", "niger", "niga", "sh!t", "f!ck", "pu55y", "puta", "puto", "fword", "wtf", "suck&nbsp;balls", "lick&nbsp;balls", "lick&nbsp;my&nbsp;balls", "suck&nbsp;my&nbsp;balls", "boob", "breast", "are&nbsp;gey", "is&nbsp;gey", "lmfao", "whore", "slut", "fag", "bich"],

	checkBadWords: function(data) {
		data = data.replace(/\s/g, '').toLowerCase();

		var bad = false;

		for(var i in module.exports.badWords) {
			var badWord = module.exports.badWords[i];

			if(data.includes(badWord)) {
				bad = true;
			}
		}

		return bad;
	},

	isBlank: function(str) {
    return (!str || /^\s*$/.test(str));
	},

	createItemCrumbs: function() {
		var newCrumbs = {};

		for(var i in itemCrumbs) {
			var itemCrumb = itemCrumbs[i];

			newCrumbs[itemCrumb.identifier] = itemCrumb;
		}

		return newCrumbs;
	},

	createFurnitureCrumbs: function() {
		var newCrumbs = {};

		for(var i in furnitureCrumbs) {
			var furnitureCrumb = furnitureCrumbs[i];

			newCrumbs[furnitureCrumb.identifier] = furnitureCrumb;
		}

		return newCrumbs;
	},

	getFurnitureCrumbById: function(id) {
		var found = false;

		for(var i in furnitureCrumbs) {
			var furnitureCrumb = furnitureCrumbs[i];

			if(furnitureCrumb.identifier == id) {
				found = furnitureCrumb;
			}
		}

		return found;
	},

	getItemCrumbById: function(id) {
		var found = false;

		for(var i in itemCrumbs) {
			var itemCrumb = itemCrumbs[i];

			if(itemCrumb.identifier == id) {
				found = itemCrumb;
			}
		}

		return found;
	},

	getArtByCrumbs: function(crumbs) {
		var furnitureObj = {};
	  var shellArt = crumbs.split('|');

	  for(var i in shellArt) {
	    var item = shellArt[i].split(':');
	    var itemObj = module.exports.getFurnitureCrumbById(item[0]);

	    if(itemObj) {
	      furnitureObj[itemObj.identifier] = {
	        id: itemObj.identifier,
	        x: item[1],
	        y: item[2]
	      };
	    }
	  }

	  return furnitureObj;
	},

	getFromBetween: {
	    results:[],
	    string:"",
	    getFromBetween:function (sub1,sub2) {
	        if(this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return false;
	        var SP = this.string.indexOf(sub1)+sub1.length;
	        var string1 = this.string.substr(0,SP);
	        var string2 = this.string.substr(SP);
	        var TP = string1.length + string2.indexOf(sub2);
	        return this.string.substring(SP,TP);
	    },
	    removeFromBetween:function (sub1,sub2) {
	        if(this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return false;
	        var removal = sub1+this.getFromBetween(sub1,sub2)+sub2;
	        this.string = this.string.replace(removal,"");
	    },
	    getAllResults:function (sub1,sub2) {
	        // first check to see if we do have both substrings
	        if(this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return;

	        // find one result
	        var result = this.getFromBetween(sub1,sub2);
	        // push it to the results array
	        this.results.push(result);
	        // remove the most recently found one from the string
	        this.removeFromBetween(sub1,sub2);

	        // if there's more substrings
	        if(this.string.indexOf(sub1) > -1 && this.string.indexOf(sub2) > -1) {
	            this.getAllResults(sub1,sub2);
	        }
	        else return;
	    },
	    get:function (string,sub1,sub2) {
	        this.results = [];
	        this.string = string;
	        this.getAllResults(sub1,sub2);
	        return this.results;
	    }
	},

	getTopicById: function(topic, client) {
		var found = false;

		for(var i in topics) {
			var topicObj = topics[i];

			var params = module.exports.getFromBetween.get(topicObj.message, "{", "}");

			if(params && params.length > 0) {
				for(var i in params) {
					var param = params[i];
					var replaced;

					switch(param) {
						case "ironOre":
							replaced = client.ore.iron;

							break;
						case "silverOre":
							replaced = client.ore.silver;

							break;
						case "goldOre":
							replaced = client.ore.gold;
					}

					if(replaced) {
						var pattern = "{" + param + "}";
						var regExp = new RegExp(pattern, "g");
						topicObj.message = topicObj.message.replace(regExp, replaced);
					}
				}
			}

			if(topicObj.id == topic) {
				found = topicObj;
			}
		}

		return found;
	},

	arrayToSentence: function(arr) {
	    var len = arr.length;
	    return arr.reduce(function(a,b,c){
	        return a + (c - 1 === length ? ', ' : ' and ') + b;
	    });
	},

	createFactionCrumbs: function() {
		var newCrumbs = {};

		for(var i in factions) {
			var factionCrumb = factions[i];

			newCrumbs[factionCrumb.internal] = factionCrumb;
		}

		return newCrumbs;
	},

	getFaction: function(internal) {
		return factions[internal];
	}
};

String.prototype.includes = function (string) {
	if (this.indexOf(string) > -1) {
		return true;
	} else {
		return false;
	}
};
