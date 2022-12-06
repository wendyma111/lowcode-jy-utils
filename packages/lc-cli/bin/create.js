const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

function create(materialName) {
  try {
    const targetPath = path.resolve(process.cwd(), materialName)
    if (fs.existsSync(targetPath)) {
      console.log(chalk.red(`文件 ${path.resolve(process.cwd(), materialName)} 已存在，请更换文件名`))
      process.exit()
    } else {
      fs.ensureDirSync(targetPath)
      generateProgram(materialName)
    }
  } catch(e) {
    console.log(chalk.red(e))
    process.exit()
  }
}

async function generateProgram(materialName) {
  try {
    const targetPath = path.resolve(process.cwd(), materialName)

    /**
     * 生成组件代码模板
     */
    await fs.copy(path.resolve(__dirname, '../template'), targetPath)

    /**
     * 重置config json文件
     */
    const configPath = path.resolve(targetPath, 'src/config/index.json')
    const config = require(configPath)
    config.componentName = materialName
    config.npmInfo.npm = `@lowcode-material/${materialName.toLowerCase()}`
    fs.writeFileSync(configPath, JSON.stringify(config, null, '\t'))

    /**
     * 重置package.json
     */
     const pkgPath = path.resolve(targetPath, 'package.json')
     const pkg = require(pkgPath)
     pkg.name = `@lowcode-material/${materialName.toLowerCase()}`
     fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t'))

    console.log(`
    组件模板生成完成，请运行一下命令，进行组件调试：

      ${chalk.green(`cd ${materialName}
      npm install 
      lc-cli debug
    `)}`)
  } catch(e) {
    console.log(chalk.red(e))
    process.exit()
  }
}

module.exports = create

