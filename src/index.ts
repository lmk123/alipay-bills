import EventEmitter = require('events')
import { stringify } from 'querystring'
import { until, ThenableWebDriver, WebElementPromise } from 'selenium-webdriver'

import createDriver from './utils/create-driver'
import { URLs, BillPageTitle } from './utils/constants'

const { titleIs, elementLocated } = until

let driver: ThenableWebDriver | null
let logged = false
let timeId: NodeJS.Timer

const event = new EventEmitter()

export const options = {
  debug: false,
  interval: 60 * 1000, // 间隔多长时间检查一次账单数据
  params: { // 账单页支持一些参数可以提供更准确的账单数据
    // status: 'success', // 交易状态：成功
    // fundFlow: 'in', // 资金流向：收入
    // tradeModes: 'FP', // 交易方式：即时到账
    // tradeType: 'TRANSFER' // 交易分类：转账
    // page: 1 // 页数
  }
}

/**
 * 在控制台输出日志
 * @param msg
 */
function log (msg: any) {
  if (options.debug) {
    console.log(`[${new Date().toLocaleString()}]`, msg)
  }
}

/**
 * 模拟人类的输入行为，即输入每个字符时间隔一段时间
 * @param {WebElementPromise} ele
 * @param {string} str
 * @return {Promise<void>}
 */
async function humanInput (ele: WebElementPromise, str: string) {
  await ele.clear()
  for (let i = 0; i < str.length; i++) {
    await ele.sendKeys(str[i])
    await (driver as ThenableWebDriver).sleep(500)
  }
}

/**
 * 使用当前的账号与密码登录并将 driver 跳转到「我的账户」高级版
 * @param {string} user - 用户名
 * @param {string} pwd - 密码
 * @return {Promise<void>}
 */
async function login (user: string, pwd: string): Promise<void> {
  if (!driver) driver = createDriver()
  await logout()
  try {
    // 跳转到登陆页
    await log('正在跳转到登陆页……')
    await driver.get(URLs.login + '?goto=' + encodeURIComponent(URLs.billsIndex + '?' + stringify(options.params)))
    // 输入用户名
    await log('正在输入用户名……')
    await humanInput(driver.findElement({ id: 'J-input-user' }), user)
    // 输入密码
    await log('正在输入密码……')
    await humanInput(driver.findElement({ id: 'password_rsainput' }), pwd)
    // 点击登陆按钮
    await log('正在点击登陆按钮……')
    await driver.sleep(500)
    // 故意没有 await 下面的语句，这样 5 秒内检测到没跳转到账单页就重试
    driver.findElement({ id: 'J-login-btn' }).click()
    // 确认浏览器跳转到了账单页
    await log('正在等待浏览器跳转到账单页……')
    await driver.wait(titleIs(BillPageTitle), 5000, '5 秒内没有跳转到账单页')

    // 判断是否在「我的账单」高级版页面
    const elements = await driver.findElements({ id: 'main' })
    if (!elements.length) {
      await log('检测到当前是标准版账单页，正在跳转到高级版账单页……')
      await driver.get(URLs.billsSwitch + '?' + stringify(options.params))
      await driver.wait(elementLocated({ id: 'main' }), 5000, '5 秒内没有跳转到高级版账单页')
    }

    logged = true
    await log('登陆成功')
  } catch (e) {
    await log('尝试登陆时失败：「' + e.message + '」，正在重试……')
    return login(user, pwd)
  }
}

/**
 * 停止循环并退出登录
 * @return {Promise<void>}
 */
async function logout () {
  if (driver && logged) {
    logged = false
    clearTimeout(timeId)
    await driver.get(URLs.logout)
  }
}

/**
 * 循环刷新页面并读取数据
 * @return {Promise<void>}
 */
async function refresh () {
  await (driver as ThenableWebDriver).wait(elementLocated({ id: 'tradeRecordsIndex' }), 5000)
  const bills = await ((driver as ThenableWebDriver).executeScript(getBills) as Promise<Bill[]>)
  // TODO 更精细的数据
  // TODO 获取后面几页的数据
  event.emit('new bills', bills)
  timeId = setTimeout(async () => {
    await (driver as ThenableWebDriver).navigate().refresh()
    refresh()
  }, options.interval)
}

export interface Bill {
  day: string
  time: string
  name: string
  orderNo: string
  target: string
  amount: string
  status: string
}

/**
 * 这个函数会运行在浏览器里通过 DOM 分析出账单数据
 */
function getBills () {
  const bills: Bill[] = []

  // 支付宝网站用了 jQuery 所以这里可以使用
  jQuery('#tradeRecordsIndex tbody tr').each(function () {
    const tds = jQuery(this).find('td')
    bills.push({
      day: jQuery(tds[0]).find('.time-d').text().trim(),
      time: jQuery(tds[0]).find('.time-h').text().trim(),
      name: jQuery(tds[2]).find('a').text().trim(),
      orderNo: jQuery(tds[3]).text().trim(),
      target: jQuery(tds[4]).text().trim(),
      amount: jQuery(tds[5]).text().trim(),
      status: jQuery(tds[7]).text().trim()
    })
  })
  return bills
}

export function on (name: string, handler: (...args: any[]) => any) {
  event.on(name, handler)
}

/**
 * 使用指定的用户名和密码开始循环读取数据
 * @param {string} user - 用户名
 * @param {string} pwd - 密码
 */
export function start (user: string, pwd: string) {
  login(user, pwd).then(refresh)
}

/**
 * 停止刷新、退出登录并毁掉浏览器会话
 * @return {Promise<void>}
 */
export async function stop () {
  if (!driver) return
  await logout()
  await driver.quit()
  driver = null
}
