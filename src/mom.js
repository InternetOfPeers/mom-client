/**
 * Implements MOM standard. It does NOT take care signing or sending the transaction to Ethereum,
 * but it creates the correct transaction payload to be sent
 */
class MOM {

	/**
	 *
	 * @param {Object} multhash
	 */
	static encodeAddMessage(multhash) {
		return Buffer.concat([Buffer.from([0]), multhash], multhash.length);
	}

}

module.exports = MOM;
