const webpack = require('webpack')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs')
const child_process = require('child_process')

function build(rootPath, cb) {
  let projectPath
  if (!rootPath) {
    projectPath = process.cwd()
  } else {
    projectPath = path.isAbsolute(rootPath ?? '') ? rootPath : path.resolve(process.cwd(), rootPath)
  }

  // 组件源代码路径
  const entryPath = path.resolve(projectPath, 'src/component/index.tsx')
  // 组件配置路径
  const configPath = path.resolve(projectPath, 'src/config/index.json')

  /**
   * 判断组件 源代码 / 配置 文件是否存在
   */
  if (!fs.existsSync(entryPath)) {
    console.log(chalk.red(`${entryPath}路径下无文件，请勿修改模板代码目录`))
    process.exit()
  }

  if (!fs.existsSync(configPath)) {
    console.log(chalk.red(`${configPath}路径下无文件，请勿修改模板代码目录`))
    process.exit()
  }

  const componentMeta = require(configPath)

  const outputPath = path.resolve(projectPath, 'dist')

  /**
   * 清理原dist目录
   */
  child_process.exec(`rm -rf ${outputPath}`)

  const compiler = webpack({
    externals: {
      react: {
        root: 'React',
        commonjs: 'react',
        commonjs2: 'react',
        amd: 'react',
      },
    },
    mode: 'production',
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
    output: {
      libraryTarget: 'umd',
      filename: `[name].[contenthash].js`,
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
  })

  compiler.run(function (err, stats) {
    if (err) {
      throw err
    }
    process.stdout.write(stats.toString({
      colors: true,
      modules: true,
      children: true,
      chunks: true,
      chunkModules: true
    }) + '\n\n')

    /**
     * 重置组件npm的入口文件
     */
    const files = fs.readdirSync(outputPath)
    const componentSourceFile = files.find(f => new RegExp("^" + componentMeta.componentName + "\.[a-zA-Z0-9]*\.js$").test(f))

    const pkg = require(path.resolve(projectPath, 'package.json'))
    pkg.main = `dist/${componentSourceFile}`
    pkg.module = `dist/${componentSourceFile}`
    fs.writeFileSync(path.resolve(projectPath, 'package.json'), JSON.stringify(pkg, null, '\t'))

    if (cb) {
      cb()
    }
  })
}

module.exports = build