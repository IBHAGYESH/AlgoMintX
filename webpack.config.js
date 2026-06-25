const path = require("path");
const webpack = require("webpack");
const LimitChunkCountPlugin = require("webpack/lib/optimize/LimitChunkCountPlugin");

const sharedRules = [
  {
    test: /\.js$/,
    exclude: /node_modules/,
    use: {
      loader: "babel-loader",
      options: {
        presets: ["@babel/preset-env"],
      },
    },
  },
];

const sharedResolve = {
  extensions: [".js", ".json"],
  alias: {
    "@algorandfoundation/algokit-utils": path.resolve(
      __dirname,
      "node_modules/@algorandfoundation/algokit-utils",
    ),
  },
};

module.exports = [
  {
    name: "browser",
    mode: "production",
    entry: "./src/algomintx.js",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "algomintx.js",
      library: {
        name: "AlgoMintX",
        type: "umd",
        export: "default",
      },
      globalObject: "this",
    },
    optimization: {
      minimize: true,
      splitChunks: false,
    },
    plugins: [
      new LimitChunkCountPlugin({
        maxChunks: 1,
      }),
      new webpack.DefinePlugin({
        "process.env.IS_BROWSER": JSON.stringify(true),
      }),
      new webpack.NormalModuleReplacementPlugin(
        /node-file-handler/,
        path.resolve(__dirname, "src/empty-module.js"),
      ),
    ],
    module: {
      rules: [
        ...sharedRules,
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    resolve: sharedResolve,
  },
  {
    name: "node",
    target: "node",
    mode: "production",
    entry: "./src/algomintx.js",
    output: {
      path: path.resolve(__dirname, "dist/node"),
      filename: "index.cjs",
      library: {
        type: "commonjs2",
        export: "default",
      },
    },
    externals: {
      algosdk: "commonjs algosdk",
    },
    plugins: [
      new webpack.NormalModuleReplacementPlugin(
        /\.css$/,
        path.resolve(__dirname, "src/empty-module.js"),
      ),
      new webpack.IgnorePlugin({
        resourceRegExp: /^@perawallet\/connect$|^@blockshake\/defly-connect$/,
      }),
    ],
    module: {
      rules: sharedRules,
    },
    resolve: sharedResolve,
  },
];
