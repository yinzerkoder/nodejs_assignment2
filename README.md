
This is an assignment 2 with Node JS Master class on Pirple.

This is a raw node.js API for a pizza delivery.

It uses no npm's or third party libraries but third party technologies such as Stripe payment platform and Mailgun email service.

The API brakdown.
1. It has /users that requires following inputs: user's email, name, password, address and terms of agreement. The data is saved in JSON formate

2. /tokens create a random token of 20 characters in JSON formate which is valid for an hour since created.

3. The user can create, fetch, update and delete user's and token data throuh a token authentication.

4. The user also can create a product cart and post and order which triggers an email service that sends out a receipt once the payment is proccessed by stripe payment service
