const path = require("path");

module.exports = {
  mode: "development", // Change to 'development' for debugging
  entry: "./src/algomintx.js", // Entry point
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "algomintx.js",
    library: "AlgoMintX",
    libraryTarget: "window",
    libraryExport: "default",
    globalObject: "this",
  },
  module: {
    rules: [
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
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".js"],
  },
};
