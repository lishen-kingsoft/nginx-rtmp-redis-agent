'use strict';

var config = require('../config');

var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');

var Q = require('q');
var logger = require('winston');

function parseParams(request) {
    var result = {};
    var query = url.parse(request.url, true).query;
    if (query) {
        result.tsPath = query.tsPath;
        result.m3u8Path = query.m3u8Path;
        result.bucket = query.bucket;
    }
    logger.debug('params is: ', result);
    return result;
}

function getFileContent(filePath) {
    var deferred = Q.defer();
    var startTime = new Date().getTime();
    fs.readFile(filePath, function (e, c) {
        if (e) {
            deferred.reject(new Error(e));
        } else {
            var endTime = new Date().getTime();
            logger.debug('read file successful, with time %dms', endTime - startTime);
            deferred.resolve(c);
        }
    });
    return deferred.promise;
}

module.exports = {
    listen: function () {
        var redisClient = config.createClient();
        var server = http.createServer(function (request, response) {
            var params = parseParams(request);
            if (params.tsPath && param.m3u8Path && param.bucket) {
                var m3u8Paths = params.m3u8Path.split(path.sep);
                var m3u8Key = params.bucket + '/' + m3u8Paths[m3u8Paths.length - 1];
                var tsPaths = params.tsPath.split(path.sep);
                var tsKey = params.bucket + '/' + tsPaths[tsPaths.length - 1];
                getFileContent(params.m3u8Path).then(function (fileContent) {
                    return redisClient.set(m3u8Key, flieContent);
                }).then(function () {
                    return redisClient.expire(m3u8Key, 60);
                }).then(function () {
                    return getFileContent(params.tsPath);
                }).then(function (fileContent) {
                    return redisClient.set(tsKey, flieContent);
                }).then(function () {
                    return redisClient.expire(tsKey, 60);
                }).catch(function (e) {
                    logger.error(e);
                });
                response.writeHead(200, {
                    'Content-Type': 'text/plain'
                });
                response.end('done');
            } else {
                var url = request.url;
                if (url.startsWith('/redis/')) {
                    var redisKey = url.replace('/redis/', '');
                    redisClient.get(redisKey).then(function (value) {
                        if (value) {
                            response.writeHead(200, {
                                'Content-Type': 'text/plain'
                            });
                            response.end('No Record Found');
                        } else {
                            response.writeHead(404, {
                                'Content-Type': 'text/plain'
                            });
                            response.end('No Record Found');
                        }
                    });
                } else {
                    response.writeHead(404, {
                        'Content-Type': 'text/plain'
                    });
                    response.end('Not Found');
                }
            }

        });

        server.listen(config.httpConfig.port);
    }
}
