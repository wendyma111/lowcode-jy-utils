#!/usr/bin/env node
const path = require('path')
const { program } = require('commander')
const chalk = require('chalk')
const fs = require('fs-extra')
const generate = require('./generate')

program
  .option('--file <file>')
  .option('--output <output>')

program.parse();

const options = program.opts();

if (!options.file) {
  console.log(chalk.red('请输入schema文件路径'))
  process.exit()
}

const schemaPath = path.isAbsolute(options.file) ? options.file : path.resolve(process.cwd(), options.file)

if (!fs.existsSync(schemaPath) || !/\.(?:js|json)$/.test(schemaPath)) {
  console.log(chalk.red('schema文件不存在 或 格式错误'))
  process.exit()
}

const outputPath = options.output 
  ? (path.isAbsolute(options.output) ? options.output : path.resolve(process.cwd(), options.output))
  : path.resolve(process.cwd(), 'output')

const schema = require(schemaPath)
generate(schema, outputPath)

