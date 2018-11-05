//const _ = require("lodash");
//const $ = require("jquery");
const log = require("loglevel");
const Editor = require("./editor");
const ethers = require("ethers");
const ko = require("knockout");
require("bootstrap");

// Messages
const __lockedAccount = "No account found. Please unlock MetaMask.";
const __legacyBrowserWarning = "Legacy or non-Ethereum browser detected. You should consider trying MetaMask!";
const __online = "online";
const __offline = "offline";
const __unknown = "unknown";

// Initial debug level
log.setDefaultLevel(log.levels.DEBUG);

// Default model
function defaultModel() {
	var self = this;
	self.ethNetworkID = ko.observable(0);
	self.ethNetworkName = ko.observable(__unknown);
	self.ethBlockNumber = ko.observable(0);
	self.ethStatus = ko.pureComputed(function () {
		return (self.ethBlockNumber() > 0 && self.ethNetworkID() > 0) ? __online : __offline;
	});
	self.ethAddress = ko.observable(__lockedAccount);
	self.ipfsStatus = ko.observable(__offline);
}

const model = new defaultModel();
ko.applyBindings(model);

// Init the editor
const editor = new Editor();
editor.init();

window.addEventListener("load", async () => {
	if (window.ethereum) {
		try {
			// Request account access if needed
			await window.ethereum.enable();
			let provider = new ethers.providers.Web3Provider(window.ethereum);
			provider.listAccounts().then(function (values) {
				if (values[0]) model.ethAddress(values[0]);
				log.debug("Current address:", model.ethAddress());
			});
			provider.getBlockNumber().then(model.ethBlockNumber);
			provider.getNetwork().then(function (network) {
				if (network) {
					model.ethNetworkID(network.chainId);
					model.ethNetworkName(network.name);
				} else {
					model.ethNetworkID(0);
					model.ethNetworkName(__unknown);
				}
			});
			// Events
			provider.on("block", (blockNumber) => {
				model.ethBlockNumber(blockNumber);

				log.debug("New block:", blockNumber);
			});
			provider._web3Provider.publicConfigStore.on("update", function (event) {
				// Get changes made by user on MetaMask
				if (event.selectedAddress) model.ethAddress(event.selectedAddress);
				else model.ethAddress(__lockedAccount);
				model.ethNetworkID(event.networkVersion);
				let network = ethers.utils.getNetwork(parseInt(event.networkVersion));
				if (network) model.ethNetworkName(network.name);
				else model.ethNetworkName(__unknown);
				// Get new block number
				provider.getBlockNumber().then(model.ethBlockNumber);
			});
		} catch (error) {
			// User denied account access...
			log.error("error:", error);
		}
	}
	// Legacy or non-dapp browsers...
	else {
		log.info(__legacyBrowserWarning);
	}
});
