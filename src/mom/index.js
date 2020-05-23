/**
* MOM implementation in JavaScript.
* It does NOT take care signing or sending the transaction to Ethereum,
* but it creates the correct transaction payload to be sent
*
* @module mom
*/
"use strict";

const multihashes = require("multihashes");
const cs = require("./constants");

exports.operations = cs.operations;

exports.encodeAddMessage = function encodeAddMessage(multhash) {
	try {
		multihashes.decode(multhash);
	} catch (error) {
		throw new Error(`message is not a valid multihash: ${error}`);
	}
	return Buffer.concat([Buffer.from([cs.operations.ADD]), multhash], multhash.length);
};
