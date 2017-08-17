import driver from './driver'
import state from '../internal/state'
import login from '../internal/login'
import options from '../public/options'
import log from './log'
import { until } from 'selenium-webdriver'

const nosh = require('noshjs')

const { elementLocated } = until

import { URLs, BillPageTitle } from './constants'

/**
 * 确保浏览器当前处于「我的账单」高级版页面
 */
export default async function () {
  if (!state.logged) {
    await login()
  }

  const title = await driver.getTitle()

  if (title !== BillPageTitle) {
    await driver.get(URLs.billsIndex + '?' + nosh.obj2qs(options.pageParams))
  }

  // 判断是否在「我的账单」高级版页面
  const elements = await driver.findElements({ id: 'main' })
  if (!elements.length) {
    await log('检测到当前是标准版账单页，正在跳转到高级版账单页……')
    await driver.get(URLs.billsSwitch + '?' + nosh.obj2qs(options.pageParams))
    await driver.wait(elementLocated({ id: 'main' }), 5000, '5 秒内没有跳转到高级版账单页')
  }

  // 偶尔页面的 title 虽然显示了但 DOM 还没有渲染出来，所以再做一个表格的检测
  await driver.wait(elementLocated({ id: 'tradeRecordsIndex' }))
}
