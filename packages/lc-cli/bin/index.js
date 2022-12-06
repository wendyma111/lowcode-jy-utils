#!/usr/bin/env node
const commander = require('commander')
const { version } = require('../package.json')
const create = require('./create')
const debug = require('./debug')
const build = require('./build')
const publish = require('./publish')

const { program } = commander

program.version(version)

program
  .command('create <materialName>')
  .description('创建物料组件')
  .action(create)

program
  .command('debug [rootPath]')
  .description('打开低代码平台进行组件调试')
  .action(debug)

program
  .command('build [rootPath]')
  .description('组件打包')
  .action(build)

program
  .command('publish [rootPath]')
  .description('组件发布')
  .action(publish)

program.parse();
