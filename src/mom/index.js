/**
 * MOM implementation in JavaScript.
 * It does NOT take care signing or sending the transaction to Ethereum,
 * but it creates the correct transaction payload to be sent
 *
 * @module mom
 */
"use strict";

const cs = require("./constants");
const multihashes = require("multihashes");

/**
 *
 * @param {*} multihash
 */
function encodeAddMessage(multihash) {
	try {
		multihashes.decode(multihash);
	} catch (error) {
		throw new Error(`message is not a valid multihash: ${error}`);
	}
	return Buffer.concat([Buffer.from([cs.operations.ADD]), multihash]);
}

/**
 *
 * @param {*} originalMultihash
 * @param {*} updatedMultihash
 */
function encodeUpdateMessage(originalMultihash, updatedMultihash) {
	try {
		multihashes.decode(originalMultihash);
	} catch (error) {
		throw new Error(`original message is not a valid multihash: ${error}`);
	}
	try {
		multihashes.decode(updatedMultihash);
	} catch (error) {
		throw new Error(`updated message is not a valid multihash: ${error}`);
	}
	return Buffer.concat([Buffer.from([cs.operations.UPDATE]), originalMultihash, updatedMultihash]);
}

/**
 *
 * @param {*} multihash
 */
function encodeDeleteMessage(multihash) {
	try {
		multihashes.decode(multihash);
	} catch (error) {
		throw new Error(`message is not a valid multihash: ${error}`);
	}
	return Buffer.concat([Buffer.from([cs.operations.DELETE]), multihash]);
}

/**
 *
 * @param {*} address
 * @param {*} multihash
 */
exports.createAddTransaction = function createAddTransaction(address, multihash) {
	return { to: address, value: 0, data: encodeAddMessage(multihash) };
};

/**
 *
 * @param {*} address
 * @param {*} originalMultihash
 * @param {*} updatedMultihash
 */
exports.createUpdateTransaction = function createUpdateTransaction(address, originalMultihash, updatedMultihash) {
	return { to: address, value: 0, data: encodeUpdateMessage(originalMultihash, updatedMultihash) };
};

/**
 *
 * @param {*} address
 * @param {*} multihash
 */
exports.createDeleteTransaction = function createDeleteTransaction(address, multihash) {
	return { to: address, value: 0, data: encodeDeleteMessage(multihash) };
};

exports.operations = cs.operations;
