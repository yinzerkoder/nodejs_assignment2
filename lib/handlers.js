/*
 * Request handlers
 */

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

// Define the handlers
var handlers = {};

// Users
handlers.users = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
}

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, email, streetAddress, password, tosAgreement
// Optional data: none
handlers._users.post = function (data, callback) {
    // Check that all required fields are filled out
    var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var email = typeof (data.payload.email) == 'string' && data.payload.email.indexOf('@') > -1 && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
    var streetAddress = typeof (data.payload.streetAddress) == 'string' && data.payload.streetAddress.trim().length > 0 ? data.payload.streetAddress.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && email && streetAddress && password && tosAgreement) {
        // Make sure that user doesn't already exist
        _data.read('users', email, function (err, data) {
            if (err) {
                // Hash the password
                var hashedPassword = helpers.hash(password);

                // Create the user object
                if (hashedPassword) {
                    var userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'email': email,
                        'streetAddress': streetAddress,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    };

                    // Store the user
                    _data.create('users', email, userObject, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, { 'Error': 'Could not create the new user' });
                        }
                    });
                } else {
                    callback(500, { 'Error': 'Could not hash the user\'s password' });
                }

            } else {
                // User already exists
                callback(400, { 'Error': 'A user with that phone number already exists' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }
};


// Users - get
// Required data: email
// Optional data: none
handlers._users.get = function (data, callback) {
    // Check if the email provided is valid
    var email = typeof (data.queryStringObject.email) == 'string' && data.queryStringObject.email.indexOf('@') > -1 && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;
    if (email) {
        //Get the token from the headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        //Verify that the given token is valid for the email
        handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
            if (tokenIsValid) {
                // lookup the user
                _data.read('users', email, function (err, data) {
                    if (!err && data) {
                        // Remove the hashed password from the user 
                        delete data.hashedPassword;
                        callback(200, data);
                    } else {
                        callback(404);
                    }
                })
            } else {
                callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

// Users - put
// Required data: email
// Optional data firstname, lastname, password // at least one must be specified
handlers._users.put = function (data, callback) {
    // Check for the required field
    var email = typeof (data.payload.email) == 'string' && data.payload.email.indexOf('@') > -1 && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;

    // Check for the optional fields
    var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var streetAddress = typeof (data.payload.streetAddress) == 'string' && data.payload.streetAddress.trim().length > 0 ? data.payload.streetAddress.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    // Error if the email is invalid
    if (email) {
        // Error if nothing is sent to update
        if (firstName || lastName || streetAddress || password) {
            //Get the token from the headers
            var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
            //Verify that the given token is valid for the email
            handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
                if (tokenIsValid) {
                    // Look up the user
                    _data.read('users', email, function (err, userData) {
                        if (!err && userData) {
                            // Update the fields necessary
                            if (firstName) {
                                userData.firstName = firstName;
                            }
                            if (lastName) {
                                userData.lastName = lastName;
                            }
                            if(streetAddress) {
                                userData.streetAddress = streetAddress;
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password);
                            }
                            // Store the new updates
                            _data.update('users', email, userData, function (err) {
                                if (!err) {
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(500, { 'Error': 'Could not update the user' });
                                }
                            })
                        } else {
                            callback(400, { 'Error': 'The specified user does not exist' });
                        }
                    });
                } else {
                    callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
                };
            });

        } else {
            callback(400, { 'Error': 'Missing fields to update' })
        }
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};
// Users - delete
// Required field: email
handlers._users.delete = function (data, callback) {
    // Check the email is valid
    var email = typeof (data.payload.email) == 'string' && data.payload.email.indexOf('@') > -1 && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
    if (email) {
        //Get the token from the headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        //Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
            if (tokenIsValid) {
                //lookup the user
                _data.read('users', email, function (err, data) {
                    if (!err && data) {
                        _data.delete('users', email, function (err) {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, { 'Error': 'Could not delete the specified user' });
                            }
                        });
                    } else {
                        callback(400, { 'Error': 'Could not find the specified user' });
                    }
                })
            } else {
                callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};


// Tokens
handlers.tokens = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
}

// Container for all the tokens submethods
handlers._tokens = {};

// Tokens - post
// Required data: email, data
// Optional data: none
handlers._tokens.post = function (data, callback) {
    var email = typeof (data.payload.email) == 'string' && data.payload.email.indexOf('@') > -1 && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if (email && password) {
        // Lookup the user who matches that phone number
        _data.read('users', email, function (err, userData) {
            if (!err && userData) {
                // Hash the sent password stored in the user pobject
                var hashedPassword = helpers.hash(password);
                if (hashedPassword == userData.hashedPassword) {
                    // If valid, create a new token with a random name. Set expiration date 1 hour in the future
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;
                    var tokenObject = {
                        'email': email,
                        'id': tokenId,
                        'expires': expires
                    };

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, function (err) {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, { 'Error': 'Could not create the new token' });
                        }
                    })
                } else {
                    callback(400, { 'Error': 'Password did not match the specified user\'s stored password' });
                }
            } else {
                callback(400, { 'Error': 'Could not find the specified user' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing the required field(s)' });
    }
}
// Tokens - get
// Required data: id
//Optional data: none
handlers._tokens.get = function (data, callback) {
    // Check that the id is valid
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        //lookup the token
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404);
            }
        })
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
}
// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function (data, callback) {
    var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if (id && extend) {
        //Lookup the token
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                //Check to make sure the tokent isn't already expired
                if (tokenData.expires > Date.now()) {
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    // Store the new updates
                    _data.update('tokens', id, tokenData, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, { 'Error': 'Could not update the token\'s expiration' });
                        }
                    });
                } else {
                    callback(400, { 'Error': 'The token has already expired, and cannot be extended' });
                }
            } else {
                callback(400, { 'Error': 'Specified token does not exist' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field(s) or field(s) are invalid' });
    }
}
// Tokens - delete
//Required data is id
//Optional data is none
handlers._tokens.delete = function (data, callback) {
    //Check if the id is valid
    var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    if (id) {
        //lookup the token
        _data.read('tokens', id, function (err, data) {
            if (!err && data) {
                _data.delete('tokens', id, function (err) {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, { 'Error': 'Could not delete the specified token' });
                    }
                });
            } else {
                callback(400, { 'Error': 'Could not find the specified token' });
            }
        })
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
}

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function (id, email, callback) {
    //Lookup the token
    _data.read('tokens', id, function (err, tokenData) {
        if (!err && tokenData) {
            //Check the token is for the given user and has not expired
            if (tokenData.email == email && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
}


// Menu handler
handlers.menu = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._menu[data.method](data, callback);
    } else {
        callback(405);
    }
}

// Container for all the menu submethods
handlers._menu = {};

// menu get request handler
handlers._menu.get = function(data,callback){
    // Check if the email provided is valid
    var email = typeof (data.queryStringObject.email) == 'string' && data.queryStringObject.email.indexOf('@') > -1 && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;

    if (email) {
        //Get the token from the headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        
        //Verify that the given token is valid for the email
        handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
            if (tokenIsValid) {
                // lookup the menu
                _data.read('menu', 'menu', function (err, data) {
                    if (!err && data) {
                        callback(200, data);
                    } else {
                        callback(404);
                    }
                })
            } else {
                callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};




// Menu items cart handler
handlers.cart = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._cart[data.method](data, callback);
    } else {
        callback(405);
    }
}

// container for all the cart submethods
handlers._cart = {};

// required data: item and price
handlers._cart.post = function (data, callback) {
    // validate the input
    var menuItem = typeof(data.payload.menuItem) == 'string' && data.payload.menuItem.trim().length > 0 ? data.payload.menuItem.trim() : false;
    var itemPrice = typeof (data.payload.itemPrice) == 'number' ? data.payload.itemPrice : false;

    if (menuItem && itemPrice){
        // get the token from the headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // lookup the user by reading the token
        _data.read('tokens',token,function(err,tokenData){
            if(!err&&tokenData){
                var userEmail = tokenData.email;

                // lookup the user data
                _data.read('users',userEmail,function(err,userData){
                    if(!err&&userData){
                        var orderCart = typeof (userData.cart) == 'object' && userData.cart instanceof Array ? userData.cart : [];
                        var cartId = helpers.createRandomString(20);

                        // create the order cart and include user's email
                        var orderCartObject = {
                            'cartId' : cartId,
                            'userEmail' : userEmail,
                            'order' : {
                                'item' : menuItem,
                                'price' : itemPrice
                            },
                            'cartCreated' : Date.now(),
                            'paymentData' : {
                                'source': 'tok_visa'
                            },
                            'orderCompleted': false
                        };

                        // save the cart object
                        _data.create('carts', cartId,orderCartObject,function(err){
                            if(!err){
                                var orderCompleted = orderCartObject.orderCompleted;
                                // add the order id to the user's object
                                userData.cart = orderCart;
                                userData.cart.push(cartId, orderCompleted);

                                // save the updated user data
                                _data.update('users',userEmail,userData,function(err){
                                    if(!err){
                                        callback(200, orderCartObject)
                                    } else {
                                        callback(500, {'Error' : 'Could not create the new order transaction'});
                                    }
                                });
                            } else {
                                callback(500, { 'Error': 'Could not create the new order transaction' });
                            }
                        });

                    } else {
                        callback(403);
                    }
                });

            } else {    
                callback(403);
            }
        });
        
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

// cart - get
// required data: email, token
handlers._cart.get = function (data, callback) {
    // Check if the email provided is valid
    var email = typeof (data.queryStringObject.email) == 'string' && data.queryStringObject.email.indexOf('@') > -1 && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;

    if (email) {
        //Get the token from the headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        //Verify that the given token is valid for the email
        handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
            if (tokenIsValid) {
                // lookup the user
                _data.read('users', email, function (err, userData) {
                    if (!err && userData) {
                        var cartId = userData.cart[0];
                        _data.read('carts', cartId, function(err,cartData){
                            if(!err && cartData){
                                callback(200, cartData);
                            } else {
                                callback(404);
                            } 
                        });
                    } else {
                        callback(404);
                    }
                })
            } else {
                callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

// Pizza order handler
handlers.order = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._order[data.method](data, callback);
    } else {
        callback(405);
    }
}

// container for all the order submethods
handlers._order = {};

// order handler
// required data: email
handlers._order.post = function (data, callback) {
    // Check if the email provided is valid
    var email = typeof (data.queryStringObject.email) == 'string' && data.queryStringObject.email.indexOf('@') > -1 && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;

    if (email) {
        //Get the token from the headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        //Verify that the given token is valid for the email
        handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
            if (tokenIsValid) {
                // lookup the user data to get cart id
                _data.read('users', email, function(err,userData) {
                    if(!err&&userData){
                        var cartId = userData.cart[0];
                        // lookup the cart data to process the order payment with stripe
                        _data.read('carts', cartId, function (err, cartData) {
                            if (!err && cartData) {
                                var orderNumber = 'order-'+helpers.createRandomString(10);
                                helpers.processStripePayment(cartData.order.price, cartData.paymentData.source, orderNumber, function (err, responseData) {
                                    if (!err) {
                                        // create and savve in the system the posted order object
                                        var postedOrderObject = {
                                            "orderId": responseData.metadata.orderId,
                                            "stripeToken": responseData.id,
                                            "customerEmail": userData.email,
                                            "orderInfo" : {
                                                "orderedItem": cartData.order.item,
                                                "orderPrice": cartData.order.price + responseData.currency
                                            },
                                            "orderDate": Date.now(),
                                            "orderStatus": responseData.paid
                                        }

                                    
                                        _data.create('orders', postedOrderObject.orderId, postedOrderObject, function(err){
                                            if(!err){
                                                var emailSubject = 'Your order summary for ' +postedOrderObject.orderId;
                                                var emailReceipt = {
                                                    "orderDetails": postedOrderObject.orderInfo,
                                                    "orderDate ": new Date().toDateString(),
                                                    "deliveryMethod": "Drone drop-off",
                                                    "deliveryTime": '30 mins',
                                                    "status" : postedOrderObject.orderStatus
                                                };
                                                var emailContent = "Thank you for your order. Here is the receipt of the order: " + emailReceipt;

                                                // send out the reciept to the user
                                                helpers.sendEmailByMailgun(postedOrderObject.customerEmail, emailSubject, emailContent, function(err, responseData) {
                                                    if(!err){
                                                        _data.read('carts', cartId, function(err,cartData){
                                                            if(!err&&cartData){
                                                                cartData.orderCompleted = true;

                                                                // update the cart data
                                                                _data.update('carts', cartId, cartData, function(err) {
                                                                    if(!err){
                                                                        callback(200, {'Server Message': "All is good"});
                                                                    } else {
                                                                        callback(500, {'Error': 'Could not update the cart'})
                                                                    }
                                                                } )
                                                            } else{
                                                                callback(404, {'Error': "Can not read carts file or it does not exist"});
                                                            }
                                                        })
                                                    } else {
                                                        callback(404, {"Error": 'Your order can not be completed'});
                                                    }
                                                } )
                                            } else{
                                                callback(400, {"Error": "Could not submit the order"});
                                            }
                                        });
                                    } else {
                                        callback(403, { 'Error': 'Can not send payment info' });
                                    }
                                });
                            } else {
                                callback(403, {'Error': 'error'});
                            }
                    });
                    } else {
                        callback(403, { 'Error': 'Can not read user\'s file'});
                    }
                });
                
            } else {
                callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};



// Ping handler
handlers.ping = function (data, callback) {
    callback(200);
};


// Not found handler
handlers.notFound = function (data, callback) {
    callback(404, {'Error' : 'Not Found'});
};


module.exports = handlers;
