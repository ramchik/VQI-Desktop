const path = require('path');

module.exports = (env, argv) => {
  const isProd = argv && argv.mode === 'production';
  return {
    entry: './src/index.jsx',
    target: 'electron-renderer',
    output: {
      // Output bundle alongside index.html so relative paths work in both
      // dev mode and inside the packaged asar archive.
      path: path.resolve(__dirname, 'src'),
      filename: 'bundle.js',
      publicPath: './'
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: { loader: 'babel-loader' }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    resolve: { extensions: ['.js', '.jsx'] },
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? false : 'source-map'
  };
};
