const _ = require("lodash");
const $ = require("jquery");
const log = require("loglevel");

const SimpleMDE = require("simplemde");

const __editorStorageID = "MOM_EDITOR";

const EditorDefaultOptions = {
	autofocus: true,
	autosave: {
		enabled: true,
		uniqueId: __editorStorageID,
		delay: 1000,
	},
	element: $("#currentMessage")[0],
	//hideIcons: ["fullscreen"],
	placeholder: "Write your MOM...",
	spellChecker: false,
	status: ["autosave", "lines", "words", "cursor"]
};

/**
 *
 */
class Editor {

	constructor(options) {
		this.options = _.defaultsDeep(options, EditorDefaultOptions);
	}

	init() {
		this.editor = new SimpleMDE(this.options);
	}

	value() {
		return this.editor.value();
	}

	printMe() {
		log.info("I get called from print.js!");
	}

	component() {
		let element = document.createElement("div");
		var btn = document.createElement("button");

		element.innerHTML = _.join(["Hello", "webpack"], " ");

		btn.innerHTML = "Click me and check the console!";
		btn.onclick = this.printMe;

		element.appendChild(btn);

		return element;
	}
}

module.exports = Editor;
