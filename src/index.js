const log = require("loglevel");
const Editor = require("./editor");
const ethers = require("ethers");
const ko = require("knockout");
const marked = require("marked");
const ipfsClient = require("ipfs-http-client");
const hash = require("hash.js");
const multihash = require("multihashes");
const $ = require("jquery");

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

// Init the editor
const editor = new Editor();
editor.init();
// set sanitize option to ignore html input
marked.setOptions({ sanitize: true });

// Init IPFS
let ipfs = ipfsClient(IPFS_DAEMON_MULTIADDR);
let ipfsRefreshing = false;

// Ethereum
let provider;

// Default model
function defaultViewModel() {
	var self = this;
	self.ethNetworkID = ko.observable(0);
	self.ethNetworkName = ko.observable(__unknown);
	self.ethBlockNumber = ko.observable(0);
	self.ethStatus = ko.pureComputed(function () {
		return (self.ethBlockNumber() > 0 && self.ethNetworkID() > 0) ? __online : __offline;
	});
	self.canSign = ko.pureComputed(function () {
		return self.canPublish() && (self.ethStatus() == __online);
	});
	self.ethAddress = ko.observable(__lockedAccount);
	self.ipfsStatus = ko.observable(__offline);
	self.canPublish = ko.computed(function () {
		return self.ipfsStatus() == __online;
	});
	self.publish = function () {
		publishToIPFS(editor.value(), ipfs);
	};
	self.refreshStatus = function () {
		refreshIPFSStatus(-1);
	};
}
const model = new defaultViewModel();
ko.applyBindings(model);

/**
 * Store raw message to IPFS and save the multihash to Ethereum
 *
 * @param {string} message
 * @param {Object} ipfs
 * @param {Object} provider
 */
let publishToIPFS = async function (message = "", ipfs) {
	if (!model.canPublish()) return showNotReady();
	// Even if IPFS encodes CID in multihash it uses always sha3-256 algorithm, so we store that value inside Ethereum.
	// This is not mandatory and the same content can be represented in different formats on different storage system.
	// The "truth" to check against remains what's inside Ethereum transactions.
	let buffer = Buffer.from(message);
	let digest = Buffer.from(hash.sha256().update(message).digest());
	let encodedMultihash = multihash.encode(digest, "sha2-256");
	await ipfs.block.put(buffer).then(async function (block) {
		if (block.data.equals(buffer) && block.cid.multihash.equals(encodedMultihash)) {
			let cid = block.cid.toString();
			successfulPublishing(cid);
		} else {
			// Something went wrong
			log.error("Error saving message to IPFS");
			log.debug("block.data", block.data, "message", message);
			log.debug("block.cid.multihash", block.cid.multihash, "encodedMultihash", encodedMultihash);
		}
	}).catch(function (error) {
		log.error("Error saving message to IPFS", error);
	});
};

let showNotReady = function () {
	$("#myModalTitle").text("Cannot publish to IPFS");
	$("#myModalMessage").text("You are not connected to any IPFS node. Please check Status and Settings.");
	$("#myModal").modal("show");
	return false;
};

let successfulPublishing = function (cid) {
	$("#myModalTitle").text("Success");
	$("#myModalMessage").text("Message published to IPFS with CID: " + cid);
	$("#myModal").modal("show");
};

/**
 *
 * @param {number} ms
 */
let refreshIPFSStatus = async function (ms = 5000) {
	if (!ipfsRefreshing) {
		ipfsRefreshing = true;
		try {
			if (ipfs) {
				let id = await ipfs.id();
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
};

window.addEventListener("load", async () => {
	// Start refresh loop for IPFS daemon status
	refreshIPFSStatus();
	// Check Ethereum
	if (window.ethereum) {
		try {
			// Request access to the Ethereum wallet
			await window.ethereum.enable();
			provider = new ethers.providers.Web3Provider(window.ethereum);
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
});

