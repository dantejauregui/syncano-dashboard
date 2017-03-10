import { resolve } from 'path';
import { getIfUtils, removeEmpty } from 'webpack-config-utils';
import webpack, { ContextReplacementPlugin } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ProgressBarPlugin from 'progress-bar-webpack-plugin';
import ExtendedDefinePlugin from 'extended-define-webpack-plugin';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import S3Plugin from 'webpack-s3-plugin';
import FaviconsWebpackPlugin from 'favicons-webpack-plugin';
import CompressionPlugin from 'compression-webpack-plugin';
import { getAppConfig, getS3Config } from './webpack-helpers';

const webpackConfig = (env = {}) => {
  const { ifDevelopment, ifNotDevelopment } = getIfUtils(env);
  const config = {
    context: resolve('src'),
    entry: {
      app: [
        'babel-polyfill',
        'react-hot-loader/patch',
        'webpack-dev-server/client?http://localhost:8080',
        'webpack/hot/only-dev-server',
        './app.js'
      ]
    },
    output: {
      filename: ifNotDevelopment('bundle.[name].[chunkhash].js', 'bundle.[name].js'),
      path: resolve(__dirname, 'dist'),
      pathinfo: ifDevelopment(true),
    },
    devtool: ifNotDevelopment('source-map', 'eval'),
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js(|x)$/,
          exclude: /node_modules/,
          use: 'eslint-loader'
        },
        {
          test: /\.js(|x)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [['es2015', { modules: false }], 'react', 'stage-0']
            }
          }
        },
        {
          test: /\.(eot|ttf|svg|woff|woff2)$/,
          include: /fonts/,
          use: 'file-loader?name=./fonts/[name]-[hash].[ext]'
        },
        {
          test: /\.(jpe?g|png|gif|svg)$/,
          exclude: /node_modules/,
          use: 'url-loader'
        },
        {
          test: /\.css$/,
          loader: ExtractTextPlugin.extract({
            use: 'css-loader'
          })
        },
        {
          test: /\.sass$/,
          use: ExtractTextPlugin.extract({
            use: [
              'css-loader',
              {
                loader: 'sass-loader',
                options: {
                  sourceMap: true,
                  includePaths: [
                    resolve(__dirname, './node_modules/compass-mixins/lib'),
                    resolve(__dirname, './src/assets/sass')
                  ]
                }
              }
            ]
          })
        }
      ]
    },
    plugins: removeEmpty([
      ifDevelopment(...[
        new ProgressBarPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin()
      ]),
      new webpack.NoEmitOnErrorsPlugin(),
      new ExtractTextPlugin({
        filename: ifNotDevelopment('styles.[chunkhash].css', 'styles.css'),
        allChunks: true
      }),
      new HtmlWebpackPlugin({ template: './index.html' }),
      new ExtendedDefinePlugin({ APP_CONFIG: getAppConfig(env) }),
      new webpack.LoaderOptionsPlugin({
        minimize: ifNotDevelopment(true),
        options: {
          eslint: {
            formatter: require('eslint-friendly-formatter'),
            configFile: '.eslintrc',
            quiet: true
          }
        }
      }),
      new FaviconsWebpackPlugin('./assets/img/syncano-symbol.svg'),
      ifNotDevelopment(...[
        new webpack.optimize.CommonsChunkPlugin({
          async: true,
          children: true
        }),
        new webpack.optimize.CommonsChunkPlugin({
          name: 'manifest',
          filename: 'manifest.js',
          minChunks: Infinity
        }),
        new ContextReplacementPlugin(/brace[\\\/]mode$/, /^\.\/(javascript|html|python|ruby|golang|swift|php|django|json|css|text)$/),
        new ContextReplacementPlugin(/brace[\\\/]theme$/, /^\.\/(tomorrow)$/),
        new ContextReplacementPlugin(/moment[\\\/]locale$/, /^\.\/(en-uk|en-us|en-au)$/),
        new CompressionPlugin({
          asset: '[path].gz[query]',
          algorithm: 'gzip',
          test: /\.js$|\.css$/,
          threshold: 10240,
          minRatio: 0.8
        })
      ]),
      env.deploy && new S3Plugin(getS3Config(env))
    ]),
    resolve: {
      extensions: ['.js', '.jsx'],
      modules: [
        'node_modules'
      ]
    },
    externals: {
      analyticsjs: 'window.analytics',
      stripejs: 'Stripe'
    },
    stats: 'errors-only',
    devServer: {
      stats: 'errors-only'
    }
  };

  if (env.debug) {
    console.log(config);
    debugger; // eslint-disable-line
  }

  return config;
};

export default webpackConfig;
