const path = require('path')
const chalk = require('chalk')
const open = require('open')
const fs = require('fs-extra')
const webpack = require('webpack')
const webpackDevServer = require('webpack-dev-server')

async function debug(rootPath) {
  const projectPath = path.isAbsolute(rootPath ?? '') ? rootPath : process.cwd()

  if (!fs.existsSync(projectPath)) {
    console.log(chalk.red(`${projectPath} 文件路径不存在`))
    process.exit()
  }

  // 组件源代码路径
  const entryPath = path.resolve(projectPath, 'src/component/index.tsx')
  // 组件配置路径
  const configPath = path.resolve(projectPath, 'src/config/index.json')

  /**
   * 判断组件 源代码 / 配置 文件是否存在
   */
  if (!fs.existsSync(entryPath)) {
    console.log(chalk.red(`${entryPath} 路径下无文件，请勿修改模板代码目录`))
    process.exit()
  }
  if (!fs.existsSync(configPath)) {
    console.log(chalk.red(`${configPath} 路径下无文件，请勿修改模板代码目录`))
    process.exit()
  }

  const componentMeta = require(configPath)

  const outputPath = path.resolve(projectPath, 'dist')

  const webpackConfig = {
    externals: {
      react: {
        root: 'React',
        commonjs: 'react',
        commonjs2: 'react',
        amd: 'react',
      },
    },
    mode: 'development',
    entry: {
      [componentMeta.componentName]: {
        import: entryPath,
        library: {
          name: `${componentMeta.componentName}_component`,
          type: 'umd',
          umdNamedDefine: true,
        }
      },
      [`${[componentMeta.componentName]}.config`]: {
        import: configPath,
        library: {
          name: `${componentMeta.componentName}_config`,
          type: 'umd',
          umdNamedDefine: true,
        }
      }
    },
    devServer: {
      port: 6001
    },
    output: {
      libraryTarget: 'umd',
      filename: `[name].js`,
      path: outputPath,
    },
    module: {
      rules: [
        {
          test: /\.(js|ts|tsx|jsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  '@babel/preset-env',
                  '@babel/preset-react',
                  '@babel/preset-typescript'
                ],
              }
            }
          ]
        },
        {
          test: /\.module\.css$/,
          use: [
            {
              loader: 'style-loader',
            },
            {
              loader: 'css-loader',
              options: {
                modules: { localIdentName: 'ty-[folder]-[local]-[hash:base64:6]' },
              },
            },
          ]
        },
        {
          test: /\.css$/,
          exclude: /\.module\.css$/,
          use: [
            {
              loader: 'style-loader',
            },
            {
              loader: 'css-loader',
              options: {
                modules: false,
              },
            },
          ]
        }
      ]
    }
  }

  const compiler = webpack(webpackConfig)
  const devServerOptions = { ...webpackConfig.devServer, open: false };
  const server = new webpackDevServer(devServerOptions, compiler);

  const runServer = async () => {
    console.log('Starting server...');
    await server.start();
    await open(`https://wendyma111.github.io/lowcode-jy/?debugComponentId=${componentMeta.componentName}`)
  };
  
  runServer();
}

module.exports = debug