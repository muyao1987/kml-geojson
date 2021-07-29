const path = require('path')
const webpack = require('webpack')
const packageInfo = require('../package.json')



function resolve(dir) {
  return path.join(__dirname, '../', dir)
}

module.exports = function (env) {
  let minimize, jsfilename
  if (env.min) {
    minimize = true
    jsfilename = 'kml-geojson.js'
  } else {
    minimize = false
    jsfilename = 'kml-geojson-src.js'
  }


  return {
    entry: './src/index.js',
    devtool: 'none',
    optimization: {
      minimize: minimize, // true 为开启压缩
    },
    mode: 'production',
    stats: 'errors-only',
    output: {
      library: 'kgUtil',
      path: path.resolve(__dirname, '../dist'),
      filename: jsfilename,
      libraryTarget: 'umd',
      umdNamedDefine: true,
    },
    externals: {    },
    module: {
      unknownContextCritical: false,
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/transform-runtime'],
            compact: false,
            ignore: ['checkTree'],
          },
        },
      ],
    },
    resolve: {
      extensions: ['.js'],
      alias: {
        '@': resolve('src'),
        entry: './src/index.js',
      },
    },
    plugins:[
      new webpack.BannerPlugin({
        banner: `${packageInfo.description}
版本信息：v${packageInfo.version}, hash值: [hash]
编译日期：${getTime()}
版权所有：Copyright by 木遥 ${packageInfo.homepage}
`,
      }),
      new webpack.NoEmitOnErrorsPlugin()
    ],
  }
}



function getTime() {
  let now = new Date()
  let m = now.getMonth() + 1
  m = m < 10 ? '0' + m : m
  let d = now.getDate()
  d = d < 10 ? '0' + d : d
  let h = now.getHours()
  h = h < 10 ? '0' + h : h
  let min = now.getMinutes()
  min = min < 10 ? '0' + min : min
  let s = now.getSeconds()
  s = s < 10 ? '0' + s : s
  return `${now.getFullYear()}-${m}-${d} ${h}:${min}:${s}`
}
