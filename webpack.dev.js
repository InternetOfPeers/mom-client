const common = require("./webpack.common.js");
const merge = require("webpack-merge");

module.exports = merge(common, {
	mode: "development",
	devtool: "inline-source-map",
	devServer: {
		contentBase: "./dist",
		port: 8081,
		host: "mom.localhost"
	}
});
