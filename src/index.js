const assert = require("assert");
const log = require("loglevel");
const ethers = require("ethers");
const ko = require("knockout");
const marked = require("marked");
const ipfsClient = require("ipfs-http-client");
const hash = require("hash.js");
const multihashes = require("multihashes");
const $ = require("jquery");
const mom = require("@internetofpeers/mom");
const SimpleMDE = require("simplemde");

require("bootstrap");

// Messages
const __lockedAccount = "No account found. Please unlock your Ethereum wallet.";
const __lockedMetaMaskAccount = "No account found. Please unlock MetaMask.";
const __legacyBrowserWarning = "Cannot find an ethereum wallet. You should consider to use Brave Browser or install MetaMask. If you are already using a browser that supports Ethereum, please enable your wallet.";
const __online = "online";
const __offline = "offline";
const __unknown = "unknown";
const __na = "not available";
const __pendingSpinner = "<div class='spinner-border spinner-border-sm text-primary' role='status'><span class='sr-only'>Loading...</span></div>";

const __operationListStorageID = "MOM_OPERATION_LIST";
const __settingsStorageID = "MOM_SETTINGS";

// Default settings
const DEFAULT_IPFS_DAEMON_MULTIADDR = "/ip4/127.0.0.1/tcp/5001";

// Init the editors
const newMessageEditorOptions = {
	autofocus: true,
	autosave: {
		enabled: true,
		uniqueId: "MOM_NEW_MESSAGE_EDITOR",
		delay: 1000,
	},
	element: $("#currentMessage")[0],
	//hideIcons: ["fullscreen"],
	placeholder: "Write your MOM...",
	spellChecker: false,
	status: ["autosave", "lines", "words", "cursor"]
};
const newMessageEditor = new SimpleMDE(newMessageEditorOptions);

const editMessageEditorOptions = {
	autofocus: true,
	autosave: {
		enabled: true,
		uniqueId: "MOM_EDIT_MESSAGE_EDITOR",
		delay: 1000,
	},
	element: $("#messageToUpdate")[0],
	spellChecker: false,
	status: ["autosave", "lines", "words", "cursor"]
};
const editMessageEditor = new SimpleMDE(editMessageEditorOptions);

// set sanitize option to ignore html input
marked.setOptions({ sanitize: true });

// Ethereum
let provider;

/**
 * Init storage
 */
let initStorage = function() {
	if (!localStorage.getItem(__operationListStorageID))
		localStorage.setItem(__operationListStorageID, JSON.stringify([]));

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
let getSavedOperationList = function() {
	log.debug("getSavedOperationList", JSON.parse(localStorage.getItem(__operationListStorageID)));
	let operationList = JSON.parse(localStorage.getItem(__operationListStorageID));
	operationList.filter(message => (message.blockNumber == null)).forEach(message => {
		message.blockNumber = __na;
		message.blockNumberComputed = __na;
	});
	return operationList;
};

let updateMessageList = function(changes) {
	// TODO
	log.debug("updateMessageList", model.messageList(), changes);

};

let initMessageList = function() {
	let tempMessageList = [];
	// Set array in covenient order
	let operations = model.operationListSorted().sort((left, right) => (left.nonce - right.nonce));
	operations.forEach(op => {
		// Apply operations
		switch (op.operation) {
			case 0:
				// add a message
				op.cid = op.firstCID;
				tempMessageList[op.firstCID] = op;
				break;
			case 1:
				// replace the old message
				delete tempMessageList[op.firstCID];
				op.cid = op.secondCID;
				tempMessageList[op.secondCID] = op;
				break;
			case 2:
				// add a reply
				op.cid = op.secondCID;
				tempMessageList[op.secondCID] = op;
				break;
			case 3:
				// deleta a message
				delete tempMessageList[op.firstCID];
				break;
			default:
				break;
		}
	});
	log.debug("tempMessageList", tempMessageList);
	let messageList = [];
	for (var key in tempMessageList) {
		// use hasOwnProperty to filter out keys from the Object.prototype
		if (tempMessageList.hasOwnProperty(key)) {
			messageList.unshift(tempMessageList[key]);
		}
	}
	model.messageList(messageList);
	// Restore operations order
	model.operationListSorted().sort((left, right) => (right.nonce - left.nonce));
};

let getSavedSettings = function() {
	return JSON.parse(localStorage.getItem(__settingsStorageID));
};

let saveSettings = function() {
	let currentSettings = { ipfsDaemonAddr: model.ipfsDaemonAddr() };
	localStorage.setItem(__settingsStorageID, JSON.stringify(currentSettings));
	//Reload IPFS
	ipfs = ipfsClient(model.ipfsDaemonAddr());
	refreshIPFSStatus(-1);
};

let editMessage = async function(cid) {
	await ipfs.block.get(cid).then(function(block) {
		model.lastEditCID(cid);
		editMessageEditor.value(block.data.toString());
		$("#edit-message-tab").tab("show");
		setTimeout(refreshEditor, 150); // Hack, but it seems to work
	});
};

let fetchMessage = async function(cid) {
	await ipfs.block.get(cid).then(function(block) {
		editMessageEditor.value(block.data.toString());
		setTimeout(refreshEditor, 150); // Hack, but it seems to work
	});
};

let refreshEditor = function() {
	editMessageEditor.value(editMessageEditor.value());
};

// Default model
function defaultViewModel() {
	var self = this;
	// State
	self.ethNetworkID = ko.observable(0);
	self.ethNetworkName = ko.observable(__unknown);
	self.ethBlockNumber = ko.observable(0);
	self.ethAddress = ko.observable(__lockedAccount);
	self.ethStatus = ko.pureComputed(function() {
		return (self.ethBlockNumber() > 0 && self.ethNetworkID() > 0) ? __online : __offline;
	});
	self.canSign = ko.pureComputed(function() {
		return self.canPublish() && (self.ethStatus() == __online);
	});
	self.canUpdate = ko.observable(false);
	self.messageList = ko.observableArray([]);
	self.operationList = ko.observableArray(getSavedOperationList());
	self.operationListSorted = ko.pureComputed(function() {
		let operationListSorted = self.operationList.sorted(function(left, right) {
			return right.nonce - left.nonce;
		});
		return ko.utils.arrayFilter(operationListSorted, function(operation) {
			return (operation.networkID == self.ethNetworkID() && operation.from.toLowerCase() == self.ethAddress().toLowerCase());
		});
	});
	ko.when(function() { return self.operationListSorted().length !== 0; }, initMessageList);
	self.operationList.subscribe(updateMessageList, null, "arrayChange");
	self.ipfsDaemonAddr = ko.observable(getSavedSettings().ipfsDaemonAddr);
	self.ipfsStatus = ko.observable(__offline);
	self.lastPublishedCID = ko.observable(__na);
	self.lastEditCID = ko.observable(__na);
	self.lastDeleteCID = ko.observable(__na);
	self.canPublish = ko.computed(function() {
		return self.ipfsStatus() == __online;
	});
	// Functions
	self.refreshStatus = function() {
		refreshIPFSStatus(-1);
	};
	self.publish = function() {
		publishToIPFS(newMessageEditor.value(), ipfs, successfulPublish);
	};
	self.addMessage = function() {
		sendAddMessage(multihashes.fromB58String(self.lastPublishedCID()), provider);
	};
	self.updateMessage = function() {
		sendUpdateMessage(multihashes.fromB58String(self.lastEditCID()), multihashes.fromB58String(self.lastPublishedCID()), provider);
	};
	self.deleteMessage = function() {
		sendDeleteMessage(multihashes.fromB58String(self.lastDeleteCID()), provider);
	};
	self.saveSettings = function() {
		saveSettings();
	};
	self.edit = function(message) {
		editMessage(message.cid);
	};
	self.delete = function(message) {
		confirmDelete(message.cid);
	};
	self.fetch = function() {
		fetchMessage(self.lastEditCID());
	};
	self.publishUpdate = function() {
		publishToIPFS(editMessageEditor.value(), ipfs, successfulUpdate);
	};
	self.comment = function(message) {
		// TODO
		log.debug(message);
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
let publishToIPFS = async function(message = "", ipfs, callback) {
	if (!model.canPublish()) return showNotReady();
	// Even if IPFS encodes CID in multihash it uses always sha3-256 algorithm, so we store that value inside Ethereum.
	// This is not mandatory and the same content can be represented in different formats on different storage system.
	// The "truth" to check against remains what's inside Ethereum transactions.
	let buffer = Buffer.from(message);
	await ipfs.block.put(buffer).then(async function(block) {
		// Do some sanity check
		let digest = Buffer.from(hash.sha256().update(message).digest());
		let encodedMultihash = multihashes.encode(digest, "sha2-256");
		log.debug("decodedMultihash", multihashes.decode(encodedMultihash));
		assert(block.data.equals(buffer) && block.cid.multihash.equals(encodedMultihash));
		model.lastPublishedCID(block.cid.toString());
		callback(model.lastPublishedCID(), model.lastEditCID());
	}).catch(function(error) {
		log.error("Error saving message to IPFS", error);
	});
};

/**
 * Show a message to the user
 */
let showNotReady = function() {
	$("#myModalTitle").text("Cannot publish to IPFS");
	$("#myModalMessage").text("You are not connected to any IPFS node. Please check Status and Settings pages.");
	$("#myModal").modal("show");
	return false;
};

/**
 * Show a message to the user
 * @param {string} cid
 */
let successfulPublish = function(cid) {
	$("#myModalTitle").text("Success");
	$("#myModalMessage").text("Message published to IPFS with CID: " + cid);
	$("#myModal").modal("show");
};

/**
 * Show a message to the user
 * @param {string} cid
 */
let successfulUpdate = function(updatedCID, originalCID) {
	if (updatedCID != originalCID) {
		model.canUpdate(true);
		$("#myModalUpdateTitle").text("Success");
		$("#myModalUpdateTitle").removeClass("text-warning");
		$("#myModalUpdateTitle").addClass("text-primary");
		$("#myModalUpdateMessage").text("Updated message published to IPFS with CID: " + updatedCID);
	} else {
		model.canUpdate(false);
		$("#myModalUpdateTitle").text("Warning");
		$("#myModalUpdateTitle").removeClass("text-primary");
		$("#myModalUpdateTitle").addClass("text-warning");
		$("#myModalUpdateMessage").text("Updated message is identical to the old one! CID: " + updatedCID);
	}
	$("#myModalUpdate").modal("show");
};

/**
 * Show a message to the user
 * @param {string} cid
 */
let confirmDelete = function(cid) {
	model.lastDeleteCID(cid);
	$("#myModalDeleteTitle").text("Delete request");
	$("#myModalDeleteMessage").text("You are sending a DELETE command for the message with CID: " + cid);
	$("#myModalDelete").modal("show");
};

let getNetworkNameBy = function(networkID) {
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
let getEtherscanPrefixBy = function(networkID) {
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
 * @param {*} operation
 * @param {*} firstCID
 * @param {*} secondCID
 * @param {*} tx
 */
function Operation(operation, firstCID, secondCID, tx) {
	let self = this;
	self.from = tx.from;
	self.to = tx.to;
	self.networkID = tx.chainId;
	self.transactionHash = tx.hash;
	let etherscanPrefix = getEtherscanPrefixBy(self.networkID);
	self.transactionHashLink = `<a target='_blank' href='https://${etherscanPrefix}etherscan.io/tx/` + tx.hash + "'>" + tx.hash.substring(0, 10) + "..." + "</a>";
	self.nonce = tx.nonce;
	self.blockNumber = ko.observable(tx.blockNumber);
	self.blockNumberComputed = ko.computed(function() {
		return (self.blockNumber() == null) ? __pendingSpinner : self.blockNumber();
	});
	self.operation = ko.observable(operation);
	self.operationComputed = ko.computed(function() {
		/*eslint indent: [2, "tab", {"SwitchCase": 1}]*/
		switch (self.operation()) {
			case 0:
				return "Add";
			case 1:
				return "Update";
			case 2:
				return "Reply";
			case 3:
				return "Delete";
			default:
				self.operationComputed = __na;
		}
	});
	self.firstCID = firstCID;
	self.secondCID = secondCID;
}

/**
 * Send a "MOM add" transaction
 * @param {*} multihash
 * @param {*} provider
 */
let sendAddMessage = function(multihash, provider) {
	log.debug(multihash.toString("hex"), multihashes.toB58String(multihash));
	let addTransacion = mom.createAddTransaction(model.ethAddress(), multihash);
	sendTransaction(addTransacion, provider);
};

/**
 * Send a "MOM update" transaction
 * @param {string} digest
 */
let sendUpdateMessage = function(originalMultihash, updatedMultihash, provider) {
	log.debug("original", originalMultihash.toString("hex"), multihashes.toB58String(originalMultihash));
	log.debug("updated", updatedMultihash.toString("hex"), multihashes.toB58String(updatedMultihash));
	let updateTransaction = mom.createUpdateTransaction(model.ethAddress(), originalMultihash, updatedMultihash);
	sendTransaction(updateTransaction, provider);
};

/**
 * Send a "MOM delete" transaction
 * @param {string} digest
 */
let sendDeleteMessage = function(multihash, provider) {
	log.debug(multihash.toString("hex"), multihashes.toB58String(multihash));
	let deleteTransacion = mom.createDeleteTransaction(model.ethAddress(), multihash);
	sendTransaction(deleteTransacion, provider);
};


/**
 * Sign and send a MOM transaction
 * @param {object} transaction
 * @param {object} provider
 */
let sendTransaction = function(transaction, provider) {
	let promise = provider.getSigner().sendTransaction(transaction);
	let momOperation = transaction.data[0]; // First byte of the payload
	promise.then(tx => {
		log.debug("Signed transaction", tx.hash);
		assert(tx.from === tx.to, "Signer and receiver must be the same!");
		let message = {};
		switch (momOperation) {
			case mom.operations.ADD:
				message = new Operation(momOperation, model.lastPublishedCID(), "", tx);
				break;
			case mom.operations.UPDATE:
			case mom.operations.REPLY:
				message = new Operation(momOperation, model.lastEditCID(), model.lastPublishedCID(), tx);
				break;
			case mom.operations.DELETE:
				message = new Operation(momOperation, model.lastDeleteCID(), "", tx);
				break;
			default:
				throw ("Unknown operation: " + momOperation);
		}
		model.operationList.push(message);
		// save message list in the local storage
		localStorage.setItem(__operationListStorageID, JSON.stringify(ko.toJS(model).operationList));
		provider.once(tx.hash, (receipt) => {
			log.debug("Mined transaction", receipt.transactionHash);
			log.debug(receipt);
			// Update transaction status
			model.operationList()
				.find(msg => (msg.transactionHash == receipt.transactionHash))
				.blockNumber(receipt.blockNumber);
			// save message list in the local storage
			localStorage.setItem(__operationListStorageID, JSON.stringify(ko.toJS(model).operationList));
		});
	}).catch(error => log.debug("Error while signing transaction", error));
};

/**
 *
 * @param {number} ms
 */
let refreshIPFSStatus = async function(ms = 5000) {
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
			provider.listAccounts().then(function(values) {
				if (values[0]) model.ethAddress(values[0]);
				log.debug("Current address:", model.ethAddress());
			});
			provider.getBlockNumber().then(model.ethBlockNumber);
			provider.getNetwork().then(function(network) {
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
			provider._web3Provider.publicConfigStore.on("update", function(event) {
				// Get changes made by user on MetaMask
				if (event.selectedAddress) model.ethAddress(event.selectedAddress);
				else if (window.ethereum.isMetaMask) model.ethAddress(__lockedMetaMaskAccount);
				else model.ethAddress(__lockedAccount);
				// Get new block number
				provider.getBlockNumber().then(function(result) {
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
