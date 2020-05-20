const log = require("loglevel");
const Editor = require("./editor");
const ethers = require("ethers");
const ko = require("knockout");
const marked = require("marked");
const ipfsClient = require("ipfs-http-client");

require("bootstrap");

// Messages
const __lockedAccount = "No account found. Please unlock your Ethereum wallet.";
const __lockedMetaMaskAccount = "No account found. Please unlock MetaMask.";
const __legacyBrowserWarning = "Legacy or non-Ethereum browser detected. You should consider to use Brave Browser or install MetaMask.";
const __online = "online";
const __offline = "offline";
const __unknown = "unknown";

// Settings
const IPFS_DAEMON_MULTIADDR = "/ip4/127.0.0.1/tcp/5001";

// Initial debug level
log.setDefaultLevel(log.levels.DEBUG);

// Default model
function defaultViewModel() {
	var self = this;
	self.ethNetworkID = ko.observable(0);
	self.ethNetworkName = ko.observable(__unknown);
	self.ethBlockNumber = ko.observable(0);
	self.ethStatus = ko.pureComputed(function () {
		return (self.ethBlockNumber() > 0 && self.ethNetworkID() > 0) ? __online : __offline;
	});
	self.ethAddress = ko.observable(__lockedAccount);
	self.ipfsStatus = ko.observable(__offline);
	self.publish = function () {
		log.debug("TODO: Publish");
		//TODO
	};
	self.refreshStatus = function () {
		refreshIPFSStatus(-1);
	};
	self.saveSettings = function () {
		log.debug("TODO:Save settings");
		//TODO
	};
}

const model = new defaultViewModel();
ko.applyBindings(model);

// Init the editor
const editor = new Editor();
editor.init();
// set sanitize option to ignore html input
marked.setOptions({ sanitize: true });

// Init IPFS
let ipfs = ipfsClient(IPFS_DAEMON_MULTIADDR);
let ipfsRefreshing = false;

async function refreshIPFSStatus(ms = 5000) {
	if (!ipfsRefreshing) {
		log.debug("Refreshing IPFS status...");
		ipfsRefreshing = true;
		try {
			if (ipfs) {
				let id = await ipfs.id();
				log.debug("IPFS ID", id);
				if (id) model.ipfsStatus(__online);
				else model.ipfsStatus(__offline);
			}
		} catch (exception) {
			log.debug("Exception while refreshing IPFS status", exception);
			model.ipfsStatus(__offline);
		} finally {
			ipfsRefreshing = false;
		}
		if (ms > 0) setTimeout(refreshIPFSStatus, ms);
	}
}

window.addEventListener("load", async () => {
	if (window.ethereum) {
		try {
			// Request access to the Ethereum wallet
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
				log.debug("New block:", blockNumber);
				model.ethBlockNumber(blockNumber);
			});
			provider._web3Provider.publicConfigStore.on("update", function (event) {
				// Get changes made by user on MetaMask
				if (event.selectedAddress) model.ethAddress(event.selectedAddress);
				else if (window.ethereum.isMetaMask) model.ethAddress(__lockedMetaMaskAccount);
				else model.ethAddress(__lockedAccount);
				// Get new block number
				provider.getBlockNumber().then(function (result) {
					model.ethBlockNumber(result);
					// Refresh page if network is changed
					if (model.ethNetworkID() != event.networkVersion) location.reload();
					model.ethNetworkID(event.networkVersion);
					let network = ethers.utils.getNetwork(parseInt(event.networkVersion));
					if (network) model.ethNetworkName(network.name);
					else model.ethNetworkName(__unknown);
				});
			});
		} catch (error) {
			// User denied account access...
			log.error("error:", error);
		}
	}
	// Legacy or non-dapp browsers...
	else {
		model.ethAddress(__legacyBrowserWarning);
		log.info(__legacyBrowserWarning);
	}

	// Start refresh loop for IPFS daemon status
	refreshIPFSStatus();
});

