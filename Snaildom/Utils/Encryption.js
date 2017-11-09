const base64 = require('base64-min');

module.exports = {
  encode: function(data, key) {
    if(data && key) {
      return base64.encodeWithKey(data, key);
    }
  },
  decode: function(data, key) {
    if(data && key) {
      return base64.decodeWithKey(data, key);
    }
  },
  snailFeed: function(str) {
    var _loc7_ = "";
    var _loc3_ = "01234567890123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    var _loc1_ = 0;

    while (_loc1_ < str.length) {
      var _loc5_ = Math.floor(str.charCodeAt(_loc1_) * 33816.77419354839 % _loc3_.length);
      var _loc2_ = String(Math.floor(str.charCodeAt(_loc1_) * 3304.217391304348));
      var _loc6_ = _loc2_.substr(0, _loc2_.length / 2) + _loc3_[Math.floor(str.charCodeAt(_loc1_) * 364 % _loc3_.length)] + _loc2_.substr(_loc2_.length / 2, _loc2_.length);
      _loc7_ = _loc7_ + (_loc3_[_loc5_] + String(_loc6_) + _loc3_[Math.floor(str.charCodeAt(_loc1_) * 1911.0000000000002 % _loc3_.length)]);
      _loc1_ = _loc1_ + 1;
    }

    _loc7_ = _loc7_.substr(_loc7_.length / 2,_loc7_.length).toLowerCase() + _loc7_.substr(0,_loc7_.length / 2).toUpperCase();
    _loc7_ = _loc7_ + String(Math.floor(_loc7_.length / 3));

    return _loc7_;
  }
}
