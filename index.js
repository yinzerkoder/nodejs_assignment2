// Primary file for API
// Dependencies

var server = require('./lib/server');


// declare the app
var app = {};

// init function
app.init = function () {
    // start the server
    server.init();
};

// execute it
app.init();

// export the app
module.exports = app;