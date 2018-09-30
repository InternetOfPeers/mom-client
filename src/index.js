const log = require("loglevel");
const Editor = require("./editor");

require("bootstrap");

// Initial settings
log.setDefaultLevel(log.levels.DEBUG);

// Modules creation
const editor = new Editor();

editor.init();
