const common = require("./webpack.common.js");
const webpack = require("webpack");
const merge = require("webpack-merge");
const CleanWebpackPlugin = require("clean-webpack-plugin");

module.exports = merge(common, {
	mode: "production",
	output: {
		filename: "[name].[contentHash].bundle.js"
	},
	plugins: [
		new CleanWebpackPlugin(["dist"]),
		new webpack.NormalModuleReplacementPlugin(
			/src\/config\.common\.js/,
			"./src/config.prod.js"
		)
	]
});
