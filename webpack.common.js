const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	entry: [
		"./src/scss/index.scss",
		"simplemde/dist/simplemde.min.css",
		"./src/assets/css/editor.css",
		"./src/assets/css/sticky-footer-navbar.css",
		"./src/config.common.js",
		"./src/index.js"
	],
	plugins: [
		new HtmlWebpackPlugin({
			title: "MOM client",
			template: "src/assets/templates/index.html"
		})
	],
	output: {
		filename: "[name].bundle.js",
		path: path.resolve(__dirname, "dist")
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"]
			},
			{
				test: /\.(scss)$/,
				use: [{
					loader: "style-loader", // inject CSS to page
				}, {
					loader: "css-loader", // translates CSS into CommonJS modules
				}, {
					loader: "postcss-loader", // Run post css actions
					options: {
						plugins: function () { // post css plugins, can be exported to postcss.config.js
							return [
								require("autoprefixer")
							];
						}
					}
				}, {
					loader: "sass-loader" // compiles Sass to CSS
				}]
			},
			{
				test: /\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
				use: "url-loader?limit=10000",
			},
			{
				test: /\.(ttf|eot|svg)(\?[\s\S]+)?$/,
				use: "file-loader",
			},
			{
				test: /\.(jpe?g|png|gif|svg)$/i,
				use: [
					"file-loader?name=images/[name].[ext]",
					"image-webpack-loader?bypassOnDebug"
				]
			}
		]
	},
	optimization: {
		splitChunks: {
			chunks: "all"
		}
	}
};
