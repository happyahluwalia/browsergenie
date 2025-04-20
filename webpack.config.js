const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './background.js',
    'model.worker': './model.worker.js',
    options: './options.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      // Rule for handling WASM files if needed directly (might not be necessary if copied)
      // {
      //     test: /\.wasm$/,
      //     type: "asset/resource",
      //     generator: {
      //         filename: '[name][ext]'
      //     }
      // },
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'content.js', to: '.' },
        { from: 'offscreen.html', to: '.' },
        { from: 'offscreen.js', to: '.' },
        { from: 'options.html', to: '.' },
        // Copy WASM files needed by transformers.js
        {
          from: 'node_modules/@xenova/transformers/dist/*.wasm',
          to: '[name][ext]' // Copies them to the root of the dist folder
        }
      ]
    })
  ],
  resolve: {
    // If transformers.js uses specific fallbacks, they might be needed
    // fallback: {
    //     "fs": false,
    //     "path": false,
    //     "crypto": false,
    // }
  },
  mode: 'production',
  // Enable experiments if advanced features like WASM integration are used directly
  // experiments: {
  //   asyncWebAssembly: true,
  // }
};
