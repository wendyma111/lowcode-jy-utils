const path = require('path')
const chalk = require('chalk')
const fs = require('fs-extra')
const inquirer = require('inquirer')
const child_process = require('child_process')
const build = require('./build')

function publish(rootPath) {
  const projectPath = rootPath 
    ? (path.isAbsolute(rootPath) ? rootPath : path.resolve(process.cwd(), rootPath))
    : process.cwd()

  const pkgPath = path.resolve(projectPath, 'package.json')
  const configPath = path.resolve(projectPath, 'src/config/index.json')

  if (!fs.existsSync(projectPath)) {
    console.log(chalk.red(`文件路径 ${projectPath} 不存在`))
    process.exit()
  }

  if (!fs.existsSync(pkgPath)) {
    console.log(chalk.red(`文件路径 ${pkgPath} 不存在`))
    process.exit()
  }

  if (!fs.existsSync(configPath)) {
    console.log(chalk.red(`文件路径 ${configPath} 不存在, 请勿修改模板代码`))
    process.exit()
  }

  const pkg = require(pkgPath)

  const { version } = pkg
  const [majorVersion, minorVersion, patchVersion] = version.split('.').map(Number)

  inquirer.prompt([
    {
      type: 'list',
      name: 'version',
      message: `选择一个新版本（当前: ${pkg.version}）`,
      choices: [
        `Patch-${majorVersion}.${minorVersion}.${patchVersion + 1}`,
        `Minor-${majorVersion}.${minorVersion + 1}.${patchVersion}`,
        `Major-${majorVersion + 1}.${minorVersion}.${patchVersion}`
      ]
    }
  ]).then((answers) => {
    const [,version] = answers.version.split('-')
    const pkg = require(pkgPath)
    const config = require(configPath)

    /**
     * 根据用户选择版本对现有版本进行覆盖
     */
    pkg.version = version
    config.npmInfo.version = version
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t'))
    fs.writeFileSync(configPath, JSON.stringify(config, null, '\t'))

    /**
     * 打包
     */
    build(projectPath, () => {
      child_process.exec(
        `cd ${projectPath} && npm publish --access public`,
        { encoding: 'utf-8' },
        (err, stdout) => {
          if (err) {
            console.log(err.stack)
            console.log('Error code: ', err.code)
            console.log('Signal received ', err.signal)
            process.exit()
          }
  
          console.log(stdout)
        }
      )
    })
  }).catch((e) => {
    console.log(chalk.red(e))
    process.exit()
  });
}

module.exports = publish