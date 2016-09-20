'use strict';

var redis = require('thunk-redis');

var redisClient = ['10.20.122.43:', '10.20.122.45:8087', '10.20.122.46:8087', '10.20.122.47:8087', '10.20.122.48:8087', '10.20.122.49:8087'];
var redisNodes = [
    {host: '10.20.122.43', port: 6379},
    {host: '10.20.122.45', port: 6379},
    {host: '10.20.122.46', port: 6379},
    {host: '10.20.122.47', port: 6379},
    {host: '10.20.122.48', port: 6379},
    {host: '10.20.122.49', port: 6379}
]


function Config() {
}

var createClient = function() {
  return new redis.createClient(redisNodes, {
      usePromise: true,
      clusterMode: true
  });
};

module.exports = Config;
module.exports.createClient = createClient;
module.exports.redisNodes = redisNodes;
module.exports.httpConfig = {
  port: 8888,
};
