const assert = require("assert");
const log = require("loglevel");
const ethers = require("ethers");
const ko = require("knockout");
const marked = require("marked");
const ipfsClient = require("ipfs-http-client");
const hash = require("hash.js");
const multihashes = require("multihashes");
const $ = require("jquery");
const Editor = require("./editor");
const mom = require("./mom");

require("bootstrap");

// Messages
const __lockedAccount = "No account found. Please unlock your Ethereum wallet.";
const __lockedMetaMaskAccount = "No account found. Please unlock MetaMask.";
const __legacyBrowserWarning = "Legacy or non-Ethereum browser detected. You should consider to use Brave Browser or install MetaMask.";
const __online = "online";
const __offline = "offline";
const __unknown = "unknown";
const __na = "not available";
const __pendingSpinner = "<div class='spinner-border spinner-border-sm text-primary' role='status'><span class='sr-only'>Loading...</span></div>";

const __messageListStorageID = "MOM_MESSAGE_LIST";
const __settingsStorageID = "MOM_SETTINGS";

// Default settings
const DEFAULT_IPFS_DAEMON_MULTIADDR = "/ip4/127.0.0.1/tcp/5001";

// Init the editor
const editor = new Editor();
editor.init();
// set sanitize option to ignore html input
marked.setOptions({ sanitize: true });

// Ethereum
let provider;

// Init storage
/**
 *
 */
let initStorage = function () {
	if (!localStorage.getItem(__messageListStorageID))
		localStorage.setItem(__messageListStorageID, JSON.stringify([]));

	if (!localStorage.getItem(__settingsStorageID)) {
		localStorage.setItem(__settingsStorageID, JSON.stringify({
			ipfsDaemonAddr: DEFAULT_IPFS_DAEMON_MULTIADDR
		}));
	}
};
initStorage();

/**
 *
 */
let getSavedMessageList = function () {
	log.debug(JSON.parse(localStorage.getItem(__messageListStorageID)));
	let messageList = JSON.parse(localStorage.getItem(__messageListStorageID));
	messageList.filter(message => (message.blockNumber == null)).forEach(message => {
		message.blockNumber = __na;
		message.blockNumberComputed = __na;
	});
	return messageList;
};

let getSavedSettings = function () {
	return JSON.parse(localStorage.getItem(__settingsStorageID));
};

let saveSettings = function () {
	let currentSettings = { ipfsDaemonAddr: model.ipfsDaemonAddr() };
	localStorage.setItem(__settingsStorageID, JSON.stringify(currentSettings));
	//Reload IPFS
	ipfs = ipfsClient(model.ipfsDaemonAddr());
	refreshIPFSStatus(-1);
};

// Default model
function defaultViewModel() {
	var self = this;
	// State
	self.ethNetworkID = ko.observable(0);
	self.ethNetworkName = ko.observable(__unknown);
	self.ethBlockNumber = ko.observable(0);
	self.ethAddress = ko.observable(__lockedAccount);
	self.ethStatus = ko.pureComputed(function () {
		return (self.ethBlockNumber() > 0 && self.ethNetworkID() > 0) ? __online : __offline;
	});
	self.canSign = ko.pureComputed(function () {
		return self.canPublish() && (self.ethStatus() == __online);
	});
	self.messageList = ko.observableArray(getSavedMessageList());
	self.messageListSorted = ko.pureComputed(function () {
		return self.messageList.sorted(function (left, right) {
			return right.nonce - left.nonce;
		});
	});
	self.ipfsDaemonAddr = ko.observable(getSavedSettings().ipfsDaemonAddr);
	self.ipfsStatus = ko.observable(__offline);
	self.lastCID = ko.observable(__na);
	self.canPublish = ko.computed(function () {
		return self.ipfsStatus() == __online;
	});
	// Functions
	self.refreshStatus = function () {
		refreshIPFSStatus(-1);
	};
	self.publish = function () {
		publishToIPFS(editor.value(), ipfs);
	};
	self.addMessage = function () {
		addMessage(multihashes.fromB58String(self.lastCID), provider);
	};
	self.saveSettings = function () {
		saveSettings();
	};
}
const model = new defaultViewModel();
ko.applyBindings(model);

// Init IPFS
let ipfs = ipfsClient(model.ipfsDaemonAddr());
let ipfsRefreshing = false;

/**
 * Store raw message to IPFS and save the multihash to Ethereum
 *
 * @param {string} message
 * @param {Object} ipfs
 */
let publishToIPFS = async function (message = "", ipfs) {
	if (!model.canPublish()) return showNotReady();
	// Even if IPFS encodes CID in multihash it uses always sha3-256 algorithm, so we store that value inside Ethereum.
	// This is not mandatory and the same content can be represented in different formats on different storage system.
	// The "truth" to check against remains what's inside Ethereum transactions.
	let buffer = Buffer.from(message);
	await ipfs.block.put(buffer).then(async function (block) {
		// Do some sanity check
		let digest = Buffer.from(hash.sha256().update(message).digest());
		let encodedMultihash = multihashes.encode(digest, "sha2-256");
		log.debug("decodedMultihash", multihashes.decode(encodedMultihash));
		assert(block.data.equals(buffer) && block.cid.multihash.equals(encodedMultihash));
		model.lastCID = block.cid.toString();
		successfulPublishing(model.lastCID);
	}).catch(function (error) {
		log.error("Error saving message to IPFS", error);
	});
};

/**
 * Show a message to the user
 */
let showNotReady = function () {
	$("#myModalTitle").text("Cannot publish to IPFS");
	$("#myModalMessage").text("You are not connected to any IPFS node. Please check Status and Settings pages.");
	$("#myModal").modal("show");
	return false;
};

/**
 * Show a message to the user
 * @param {string} cid
 */
let successfulPublishing = function (cid) {
	$("#myModalTitle").text("Success");
	$("#myModalMessage").text("Message published to IPFS with CID: " + cid);
	$("#myModal").modal("show");
};


let getNetworkNameBy = function (networkID) {
	switch (networkID) {
		case 1:
			return "homestead";
		case 2:
			return "morden";
		case 3:
			return "ropsten";
		case 4:
			return "rinkeby";
		case 5:
			return "goerli";
		case 42:
			return "kovan";
		case 61:
			return "classic";
		case 62:
			return "classicTestnet";
		default:
			return "";
	}
};

/**
 *
 * @param {number} networkID
 */
let getEtherscanPrefixBy = function (networkID) {
	let networkName = getNetworkNameBy(networkID);
	return (
		networkName == "homestead" ||
		networkName == "morden" ||
		networkName == "classic" ||
		networkName == "classicTestnet" ||
		networkName == "") ? "" : networkName + ".";
};

/**
 *
 * @param {string} transactionHash
 * @param {number} nonce
 * @param {number} blockNumber
 * @param {string} operation
 * @param {string} cid
 */
function Message(operation, cid, tx) {
	let self = this;
	self.networkID = tx.chainId;
	self.transactionHash = tx.hash;
	let etherscanPrefix = getEtherscanPrefixBy(self.networkID);
	self.transactionHashLink = `<a target='blank' href='https://${etherscanPrefix}etherscan.io/tx/` + tx.hash + "'>" + tx.hash.substring(0, 10) + "..." + "</a>";
	self.nonce = tx.nonce;
	self.blockNumber = ko.observable(tx.blockNumber);
	self.blockNumberComputed = ko.computed(function () {
		return (self.blockNumber() == null) ? __pendingSpinner : self.blockNumber();
	});
	self.operation = ko.observable(operation);
	self.operationComputed = ko.computed(function () {
		/*eslint indent: [2, "tab", {"SwitchCase": 1}]*/
		switch (self.operation()) {
			case 0:
				return "Add";
			default:
				self.operationComputed = __na;
		}
	});
	self.cid = cid;
}

/**
 * Send a "MOM add" transaction
 * @param {string} digest
 */
let addMessage = function (multihash, provider) {
	log.debug(multihash.toString("hex"), multihashes.toB58String(multihash));
	let request = { to: model.ethAddress(), value: 0, data: mom.encodeAddMessage(multihash) };
	let promise = provider.getSigner().sendTransaction(request);
	promise.then(tx => {
		log.debug("Signed transaction", tx.hash);
		let cid = model.lastCID;
		model.messageList.push(new Message(mom.operations.ADD, cid, tx));
		// save message list in the local storage
		localStorage.setItem(__messageListStorageID, JSON.stringify(ko.toJS(model).messageList));
		provider.once(tx.hash, (receipt) => {
			log.debug("Mined transaction", receipt.transactionHash);
			log.debug(receipt);
			// Update transaction status
			model.messageList()
				.find(msg => (msg.transactionHash == receipt.transactionHash))
				.blockNumber(receipt.blockNumber);
			// save message list in the local storage
			localStorage.setItem(__messageListStorageID, JSON.stringify(ko.toJS(model).messageList));
		});
	}).catch(error => log.debug("Error while signing transaction", error));
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

/*
Transaction Response
{
    // Only available for mined transactions
    blockHash: "0x7f20ef60e9f91896b7ebb0962a18b8defb5e9074e62e1b6cde992648fe78794b",
    blockNumber: 3346463,
    timestamp: 1489440489,

    // Exactly one of these will be present (send vs. deploy contract)
    // They will always be a properly formatted checksum address
    creates: null,
    to: "0xc149Be1bcDFa69a94384b46A1F91350E5f81c1AB",

    // The transaction hash
    hash: "0xf517872f3c466c2e1520e35ad943d833fdca5a6739cfea9e686c4c1b3ab1022e",

    // See above "Transaction Requests" for details
    data: "0x",
    from: "0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8",
    gasLimit: utils.bigNumberify("90000"),
    gasPrice: utils.bigNumberify("21488430592"),
    nonce: 0,
    value: utils.parseEther(1.0017071732629267),

    // The chain ID; 0 indicates replay-attack vulnerable
    // (eg. 1 = Homestead mainnet, 3 = Ropsten testnet)
    chainId: 1,

    // The signature of the transaction (TestRPC may fail to include these)
    r: "0x5b13ef45ce3faf69d1f40f9d15b0070cc9e2c92f3df79ad46d5b3226d7f3d1e8",
    s: "0x535236e497c59e3fba93b78e124305c7c9b20db0f8531b015066725e4bb31de6",
    v: 37,

    // The raw transaction (TestRPC may be missing this)
    raw: "0xf87083154262850500cf6e0083015f9094c149be1bcdfa69a94384b46a1f913" +
           "50e5f81c1ab880de6c75de74c236c8025a05b13ef45ce3faf69d1f40f9d15b0" +
           "070cc9e2c92f3df79ad46d5b3226d7f3d1e8a0535236e497c59e3fba93b78e1" +
           "24305c7c9b20db0f8531b015066725e4bb31de6"
}
*/

