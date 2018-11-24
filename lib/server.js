// server related tasks

// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var fs = require('fs');
var path = require('path');
var util = require('util');
var debug = util.debuglog('server');

var config = require('./config');
var helpers = require('./helpers');

var handlers = require('./handlers');

// instatiate the server module object
var server = {};


// Instantiate the HTTP server
server.httpServer = http.createServer(function (req, res) {
    server.unifiedServer(req, res);
});

// Instatiate the HTTPS server
server.httpsServerOption = {
    'key': fs.readFile(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFile(path.join(__dirname, '/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOption, function (req, res) {
    server.unifiedServer(req, res);
});




// All the server logic for both the http and https servers
server.unifiedServer = function (req, res) {

    // Get the URL and parse it
    var parsedUrl = url.parse(req.url, true);
    // Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');
    // Set the query string as an object
    var queryStringObject = parsedUrl.query;

    // Get the HTTP method
    var method = req.method.toLowerCase();


    // Get the headers as an object
    var headers = req.headers;

    // Get the payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    req.on('data', function (data) {
        buffer += decoder.write(data);
    });

    req.on('end', function () {
        buffer += decoder.end();

        // Choose the handler that this request should go to, if not found use notFound handler
        var chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : server.router.notFound;
        //  Construct the data object to send to the handler
        var data = {
            'trimmedPath': trimmedPath,
            "queryStringObject": queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        };

        // Route the request to the handler specified in the router
        chosenHandler(data, function (statusCode, payload) {
            // Use the status code called back by the handler or default to 200
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
            // Use the payload called back by the handler or default to an empty object
            payload = typeof (payload) == 'object' ? payload : {};
            // Convert the payload into string
            var payloadString = JSON.stringify(payload);
            // Return the response
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(statusCode);
            res.end(payloadString);
            // if the response 200, print green, otherwise print red
            if (statusCode == 200) {
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
            } else {
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);

            }
        });

    });
}

// Define a request router
server.router = {
    "ping": handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'menu': handlers.menu,
    'order': handlers.order,
    'cart': handlers.cart,
    'notFound': handlers.notFound
};;

// init scripts
server.init = function () {
    // Start the HTTP server
    server.httpServer.listen(config.httpPort, function () {
        console.log('\x1b[36m%s\x1b[0m', "The server is listening on port " + config.httpPort);
    });

    // Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, function () {
        console.log('\x1b[35m%s\x1b[0m', "The server is listening on port " + config.httpsPort);

    });

};


module.exports = server;



// TESTING
// @TODO delete this

// __data.create('test', 'newFile', {'foo' : 'bar'}, function(err) {
//     console.log('this was the error', err);
// });
// __data.read('test','newFile',function(err,data){
//     console.log('this was the error', err, 'and this was the data',data);
// });
// __data.update('test','newFile', {'fizz':'buzz'}, function(err){
//     console.log('this was the error', err);
// });
// __data.delete('test','newFile', function(err){
//     console.log('this was the error', err);
// });