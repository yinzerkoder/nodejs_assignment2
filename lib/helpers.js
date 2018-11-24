// Helpers for various tasks


// dependencies
var crypto = require('crypto');
var querystring = require('querystring');
var https = require('https');

var config = require('./config');

// Container for all the helpers
var helpers = {};

// Create a SHA256 hash
helpers.hash = function (str) {
    if (typeof (str) == 'string' && str.length > 0) {
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function (str) {
    try {
        var obj = JSON.parse(str);
        return obj;
    } catch (e) {
        return {};
    }
};

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = function (strLength) {
    strLength = typeof (strLength) == 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        // Define all the posiible characters that could go into a string
        var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

        // Start the final string
        var str = '';
        for (i = 1; i <= strLength; i++) {
            // Get a random character from the possibleCharacters string
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            // Append this character to the final string
            str += randomCharacter;
        }

        // Return the final string
        return str;

    } else {
        return false;
    }
}

// Send an SMS message via Twilio
helpers.sendTwilioSms = function (phone, msg, callback) {
    // validate the parameters
    phone = typeof (phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof (msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
    if (phone && msg) {
        // configure the requrest payload to twilio
        var payload = {
            'From': config.twilio.fromPhone,
            'To': '+1' + phone,
            'Body': msg
        };

        // stringify the payload
        var stringPayload = querystring.stringify(payload);

        // configure the request details
        var requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };

        // instatiate the request object
        var req = https.request(requestDetails, function (res) {
            // grab the status of the sent request
            var status = res.statusCode;
            // callback successfully if the requrest went through
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Status code returned was ' + status);
            }
        });

        // bind to the error event so it doesnt get thrown
        req.on('error', function (e) {
            callback(e);
        });

        // add the payload
        req.write(stringPayload);

        // end the request
        req.end();

    } else {
        callback('Given parameters were missing or invalid');
    }
};


helpers.sendEmailByMailgun = function(email,subject,msg,callback){
    // validate the params
    email = typeof (email) === 'string' && email.indexOf('@') > -1 && email.trim().length > 0 ? email.trim() : false;
    msg = typeof (msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 5000 ? msg.trim() : false;
    subject = typeof (subject) == 'string' && subject.trim().length > 0 && subject.trim().length <= 5000 ? subject.trim() : false;

    if(email&&subject&&msg){
        //configure the request payload to mailgun
        var payload = {
            "from" : config.mailgun.from,
            "to" : email,
            "subject": subject,
            "text" : msg
        }
        
        // convert payload into JSON
        var stringPayload = querystring.stringify(payload);

        // configure the request details
        var requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.mailgun.net',
            'method': 'POST',
            'path': '/v3/'+config.mailgun.DNS+'/messages',
            'auth': 'api:'+config.mailgun.apiKey,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };


        var req = https.request(requestDetails, function (res) {

            // grab the response data stream
            var apiResponse = '';
            res.on('data', function (data) {
                apiResponse += data;
            });

            // grab the status of the sent request
            var status = res.statusCode;
            
            res.on('end', function (data) {

                // callback successfully if the requrest went through
                if (status == 200 || status == 201) {
                    var resStream = helpers.parseJsonToObject(apiResponse);
                    callback(false, resStream);
                } else {
                    callback('Status code returned was ' + status);
                }
            });

        });

        // bind to the error event so it doesnt get thrown
        req.on('error', function (e) {
            callback(e);
        });

        // add the payload
        req.write(stringPayload);

        // end the request
        req.end();

    } else {
        callback('Given parameters were missing or invalid');
    }

}

helpers.processStripePayment = function (price, source, metadata, callback) {
    // validate the params
    price = typeof (price) == 'number' && price > 0 ? price : false;
    source = typeof (source) == 'string' && source.trim().length > 0 && source.trim().length <= 500 ? source.trim() : false;

    if (price && source) {
        //configure the request payload to stripe
        var payload = {
            "amount": price,
            "currency": 'usd',
            "source": source,
            "description": "Charged For Pizza Order",
            "metadata[orderId]" : metadata
        }

        // convert payload into JSON
        var stringPayload = querystring.stringify(payload);


        // configure the request details
        var requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.stripe.com',
            'method': 'POST',
            'path': '/v1/charges',
            'auth': config.stripeApi,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };

        // instatiate the request object
        var req = https.request(requestDetails, function (res) {
        
            // grab the response data stream
            var apiResponse = '';
            res.on('data', function (data) {
                apiResponse += data;
            });

            // grab the status of the sent request
            var status = res.statusCode;

            res.on('end', function(data) {

                // callback successfully if the requrest went through
                if (status == 200 || status == 201) {
                    var resStream = helpers.parseJsonToObject(apiResponse);
                    callback(false, resStream);
        
                } else {
                    callback('Status code returned was ' + status);
                }
            });    

        });

        // bind to the error event so it doesnt get thrown
        req.on('error', function (e) {
            callback(e);
        });


        // add the payload
        req.write(stringPayload);

        // end the request
        req.end();
    } else {
        callback('Given parameters were missing or invalid');
    }

}

module.exports = helpers;