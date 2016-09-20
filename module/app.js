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
			var base = Buffer(c).toString('base64')
            var endTime = new Date().getTime();
            logger.info('get file %s and en-base64 successful, with time %dms', filePath, endTime - startTime);
            deferred.resolve(base);
        }
    });
    return deferred.promise;
}

module.exports = {
    listen: function () {
        var redisClient = config.createClient();
        var server = http.createServer(function (request, response) {
            var params = parseParams(request);
            if (params.tsPath && params.m3u8Path && params.bucket) {
				var startTime = new Date().getTime();
                var m3u8Paths = params.m3u8Path.split(path.sep);
                var m3u8Key = params.bucket + '/' + m3u8Paths[m3u8Paths.length - 1];
                var tsPaths = params.tsPath.split(path.sep);
                var tsKey = params.bucket + '/' + tsPaths[tsPaths.length - 1];
                getFileContent(params.m3u8Path).then(function (fileContent) {
					logger.debug('m3u8 key is: ', m3u8Key);
					logger.debug('m3u8 size is: ', fileContent.length);
                    return redisClient.setex(m3u8Key, 60, fileContent);
                }).then(function () {
                    return getFileContent(params.tsPath);
                }).then(function (fileContent) {
					logger.debug('ts key is: ', tsKey);
					logger.debug('ts size is: ', fileContent.length);
                    return redisClient.setex(tsKey, 60, fileContent);
                }).then(function () {
					var endTime = new Date().getTime();
					logger.info('set redis successful, with time %dms', endTime - startTime);
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
					var startTime = new Date().getTime();
                    redisClient.get(redisKey).then(function (value) {
                        if (value) {
							logger.debug('get file size is: ', value.length);
                            response.writeHead(200, {
								'Content-Type': 'application/octet-stream'
							});
							response.write(new Buffer(value, 'base64'));
							var endTime = new Date().getTime();
							logger.info('get redis %s and de-base64 successful, with time %dms', redisKey, endTime - startTime);
                            response.end();
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
