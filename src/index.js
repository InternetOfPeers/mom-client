const _ = require("lodash");
const $ = require("jquery");
const log = require("loglevel");
const Editor = require("./editor");
const ethers = require('ethers');
const ko = require('knockout');
require("bootstrap");

// Initial settings
log.setDefaultLevel(log.levels.DEBUG);

// Default model
let model = {
	ethStatus: ko.observable("offline"),
	ethBlockNumber: ko.observable(0),
	ethAddress: ko.observable("not selected"),
	ipfsStatus: ko.observable("offline")
};

ko.applyBindings(model);

// Init the editor
const editor = new Editor();
editor.init();

window.addEventListener('load', async () => {
	// Modern dapp browsers...
	if (window.ethereum) {
		try {
			// Request account access if needed
			await ethereum.enable();
			let provider = new ethers.providers.Web3Provider(window.ethereum);
			provider.listAccounts().then(function (values) {
				model.ethAddress(values[0]);
				log.debug("Current address:", model.ethAddress());
			});
			provider.getBlockNumber().then(model.ethBlockNumber);
			provider.on('block', (blockNumber) => {
				model.ethBlockNumber(blockNumber);
				log.debug('New Block: ' + blockNumber);
			});
		} catch (error) {
			// User denied account access...
			console.error("error:", error);
		}
	}
	// Legacy or non-dapp browsers...
	else {
		console.log('Legacy or non-Ethereum browser detected. You should consider trying MetaMask!');
	}
});
