const _ = require('lodash')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const prettier = require('prettier')
const prettierConfig = require('../prettier.config')

function generate(schema, outputPath) {
  // 将template拷贝到outputPath
  fs.copySync(path.resolve(__dirname, '../template'), `${outputPath}/`)

  // 生成全局数据源
  generateStore(schema, outputPath)

  // 生成页面
  generatePage(schema, outputPath)

  // 生成代码完成提示
  console.log(chalk.green(`代码生辰完成 请至 ${outputPath} 路径下查看`))
}

// 生成package.json
function generatePackageJson(totalDeps, componentsMap, outputPath) {
  const pkgJson = require(`${outputPath}/package.json`)

  _.forEach(totalDeps, componentName => {
    const { npmInfo } = componentsMap[componentName]
    pkgJson.dependencies[npmInfo.npm] = npmInfo.version
  })

  // saveToFile(`${outputPath}/package.json`, JSON.stringify(pkgJson))
  fs.writeFileSync(`${outputPath}/package.json`, JSON.stringify(pkgJson, null, '\t'))
}

// 生成全局数据源 & 自定义方法
function generateStore(schema, outputPath) {
  const { data: globalData, methods, pagesMap } = schema

  const storeData = {}
  storeData.global = _.mapValues(globalData, ({ defaultValue }) => {
    return defaultValue
  })
  const pageStoreData = _.mapValues(pagesMap, ({ data }) => {
    return _.mapValues(data, ({ defaultValue }) => {
      return defaultValue
    })
  })

  _.assign(storeData, pageStoreData)

  let methodString = ``
  let methodId = ``

  _.map(methods, ({ value, key }) => {
    methodString += value.replace(/handler/, key) + '\n'
    methodId += `${key},\n`
  })

  const storeFile = `
  import { observable, action } from "mobx"
  import _ from 'lodash'

  const data = ${JSON.stringify(storeData)}

  export const $state = observable(data)
  
  // 自定义方法
  ${methodString}

  export const $api = {
    dispatch: action((path: string, value: any) => {
      _.set($state, path, value)
    }),
    custom: {
      ${methodId}
    }
  }
  `

  saveToFile(`${outputPath}/src/store/index.ts`, storeFile)
}

// 生成页面 & 路由
function generatePage(schema, outputPath) {
  const { pagesMap } = schema

  let routeImport = ``
  let routePage = ``

  // 该应用中使用的所有组件
  let totalDeps = []

  _.forEach(pagesMap, (page, key) => {

    // 收集组件依赖
    const compDeps = []
    let compDepsStr = ``

    _.forEach(page.componentTree, ({ componentName }) => {
      if (componentName) {
        if (!compDeps.includes(componentName)) {
          compDeps.push(componentName)
          compDepsStr += `import ${componentName} from '${schema.componentsMap[componentName].npmInfo.npm}'\n`
        }
      }
    })

    totalDeps = totalDeps.concat(compDeps)

    // 获取根组件
    const rootNode = _.find(page.componentTree, ({ parentId }) => {
      return parentId === null
    })

    // 生成生命周期
    const lifecycle =
      page.lifecycle
        .replace(/export(\s+)default/, 'const lifecycle = ')
        .replace(/\$state/g, 'this.props.$state')
        .replace(/\$api/g, 'this.props.$api')

    const componentDidMount = new Function(`
      ${lifecycle}
      return lifecycle.componentDidMount
    `)()

    const componentDidUpdate = new Function(`
      ${lifecycle}
      return lifecycle.componentDidUpdate
    `)()

    const componentWillUnmount = new Function(`
      ${lifecycle}
      return lifecycle.componentWillUnmount
    `)()

    const pageFile = `
    import React, { Component } from 'react'
    import { inject, observer } from 'mobx-react'
    import withNavigate from 'hoc/withNavigate'
    ${compDepsStr}

    @inject(({ store }: { store: { $state: any, $api: any } }) => ({
      $state: {
        global: store.$state.global,
        ${key}: store.$state.${key}
      },
      $api: store.$api
    }))
    @withNavigate
    @observer
    class ${_.upperFirst(key)} extends Component<{ $state: any, $api: any }> {
      ${componentDidMount ? componentDidMount.toString() : ''}
      ${componentDidUpdate ? componentDidUpdate.toString() : ''}
      ${componentWillUnmount ? componentWillUnmount.toString() : ''}

      render() {
        return (
          ${generateComp(rootNode, page.componentTree)}
        )
      }
    } 

    export default ${_.upperFirst(key)}
    `
    routeImport += `import ${_.upperFirst(key)} from 'pages/${key}'\n`
    routePage += `
    {
      path: '/${key}',
      element: React.createElement(${_.upperFirst(key)})
    },
    `
    saveToFile(`${outputPath}/src/pages/${key}/index.tsx`, pageFile)
  })

  const route = `
  import React from "react";
  ${routeImport}

  export default [
    ${routePage}
  ]
  `

  saveToFile(`${outputPath}/src/pages/index.ts`, route)

  // 生成packageJSON
  generatePackageJson(totalDeps, schema.componentsMap, outputPath)
}

// 生成组件
function generateComp(node, componentTree) {
  if (node.parentId === null) {
    return `
      <>
        ${node.children.map((childId) => generateComp(componentTree[childId], componentTree)).join('')}
      </>
    `
  } else {
    let propStr = ``

    _.forEach(node.props, (value, key) => {
      if (value?.type === 'JSExpression') {
        propStr += ` ${key}={${value.value.replace(/\$state/g, 'this.props.$state')}}`
        return
      }
      if (value?.type === 'JSFunction') {
        const [,method,] = value.path.split('.')
        if (method === 'custom') {
          // 自定义事件
          propStr += ` ${key}={${value.path.replace(/\$api/g, 'this.props.$api')}}`
        } else {
          // 内置事件
          switch(value.path) {
            case '$api.dispatch': {
              const { variablePath, value: targetValue } = value.extra
              propStr += ` ${key}={() => this.props.$api.dispatch('${variablePath.replace('$state.', '')}', ${typeof targetValue === 'string' ? `'${targetValue}'`: targetValue})}`
              break
            }
            case '$api.navigate': {
              const { targetPageId } = value.extra
              propStr += ` ${key}={() => this.props.$api.navigate('${targetPageId}')}`
              break
            }
            default: break;
          }
        }
        return
      }
      propStr += ` ${key}={${Object.prototype.toString.call(value) === '[object Object]'
        ? JSON.stringify(value)
        : (typeof value === 'string' ? `"${value}"` : value)}}`
    })

    return `<${node.componentName} ${propStr}>
        ${node.children.length > 0
        ? node.children.map((childId) => generateComp(componentTree[childId], componentTree)).join('')
        : ''
      }
      </${node.componentName}>`
  }
}

function saveToFile(path, jsx) {
  fs.ensureFileSync(path)
  fs.writeFileSync(path, prettier.format(jsx, prettierConfig))
}

module.exports = generate