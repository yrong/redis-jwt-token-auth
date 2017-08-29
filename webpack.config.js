var webpack = require('webpack');
var path = require('path');
var fs = require("fs");


const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin');
const GitRevisionPlugin = require('git-revision-webpack-plugin')

var mods = {};
fs.readdirSync("node_modules")
    .filter(x => [".bin"].indexOf(x) === -1)
    .forEach(mod => {
        mods[mod] = "commonjs " + mod;
    });

var devtool = 'source-map'

var entry = {server:'./app.js',sync:'./sync.js'}
var packages = [
    {from:'config',to:'config'},
    {from:'public',to:'public'},
    {from:'test/*.json'},
    {from:'node_modules',to:'node_modules'}
]

var releaseDir = process.env.ReleaseDir||path.join(__dirname, 'release')

var plugins = [
    new webpack.optimize.UglifyJsPlugin({
        sourceMap: devtool && (devtool.indexOf("sourcemap") >= 0 || devtool.indexOf("source-map") >= 0)
    }),
    new CopyWebpackPlugin(packages, {ignore: ['*.gitignore']}),
    new CleanWebpackPlugin(['build']),
    new GitRevisionPlugin(),
    new WebpackShellPlugin({onBuildStart:['echo "Webpack Start"'], onBuildEnd:[`/bin/bash ./postbuild.sh --dir=${releaseDir}`]})
];

var config = {
    target: 'node',
    entry: entry,
    devtool: devtool,
    output: {
        path: path.join(__dirname,'./build'),
        filename: '[name].js'
    },
    node: {
        __filename: true,
        __dirname: true
    },
    externals: mods,
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader'
                }
            }
        ]
    },
    plugins: plugins
};

module.exports = config;
