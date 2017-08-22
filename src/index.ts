import EventEmitter = require('events')
import { stringify } from 'querystring'
import { until, ThenableWebDriver, WebElementPromise } from 'selenium-webdriver'

import createDriver from './utils/create-driver'
import { URLs, BillPageTitle } from './utils/constants'

const { titleIs, elementLocated } = until

let driver: ThenableWebDriver
let logged = false
let timeId: NodeJS.Timer
let stopped = true
let lastTradeNo: string
let refreshing: Promise<void>

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
 * 模拟人类的输入行为，输入每个字符之间间隔一段时间
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
    await driver.get(URLs.login + '?goto=' + encodeURIComponent(URLs.billsIndex))
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
      await driver.get(URLs.billsSwitch)
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
    log('准备登出账号……')
    logged = false
    clearTimeout(timeId)
    await driver.get(URLs.logout)
    log('已登出账号。')
  }
}

/**
 * 循环刷新页面并读取数据
 * @return {Promise<void>}
 */
async function refresh () {
  if (stopped) return
  refreshing = new Promise(async resolve => {
    const bills = await query(lastTradeNo)

    if (bills.length) {
      lastTradeNo = (bills[0].tradeNo as string)
      event.emit('new bills', bills)
    }

    resolve()
  })

  timeId = setTimeout(refresh, options.interval)
}

/**
 * 查询账单数据
 * @param {string} tradeNo - 根据流水号判断订单查询应该何时结束
 * @param params - 页面参数
 * @return {Promise<Bill[]>}
 */
async function query (tradeNo?: string, params = options.params) {
  if (!logged) return Promise.reject(new Error('Login first.'))
  const bills: Bill[] = []
  let page = 1

  async function queryPage (): Promise<void> {
    if (!driver) return

    await driver.get(URLs.billsAdvanced + '?' + stringify(Object.assign({ page }, params)))
    await driver.wait(elementLocated({ id: 'tradeRecordsIndex' }), 5000)

    const pageBills = await (driver.executeScript(getBills) as Promise<Bill[]>)

    // 如果没有设置终点流水号，则只返回第一页的数据
    if (!tradeNo) {
      bills.push(...pageBills)
      return
    }

    // 查找这一页的账单内是否有匹配的流水号
    let tradeIndex
    pageBills.some((bill, index) => {
      if (bill.tradeNo === tradeNo) {
        tradeIndex = index
        return true
      }
      return false
    })

    // 如果找到了匹配的流水号，则将前面的账单数据推入数组中并中断查询
    if (typeof tradeIndex === 'number') {
      bills.push(...pageBills.slice(0, tradeIndex))
      return
    }

    // 没有找到匹配的流水号，则把这页数据全都推入数组
    bills.push(...pageBills)

    // 如果还有下一页数据，则接着查询
    const els = await driver.findElements({ className: 'page-next' })
    if (els.length) {
      page += 1
      return queryPage()
    }
  }

  await queryPage()

  return bills
}

export interface Bill {
  createTime?: number // 账单的创建时间戳，精确到秒
  memo: string // 备注
  name: string // 名称
  orderNo?: string // 订单号
  tradeNo?: string // 交易号或者流水号
  target: string // 对方
  amount: number // 金额，复数表示支出，正数表示收入
  status: string // 账单状态
}

/**
 * 这个函数会运行在浏览器里通过 DOM 分析出账单数据
 */
function getBills () {
  const bills: Bill[] = []

  // 支付宝网站用了 jQuery 所以这里可以使用
  jQuery('#tradeRecordsIndex tbody tr').each(function () {
    const $tr = jQuery(this)
    const bill: Bill = {
      memo: $tr.find('td.memo .memo-info').text().trim(),
      name: $tr.find('td.name a').text().trim(),
      target: $tr.find('td.other .name').text().trim(),
      amount: Number($tr.find('td.amount .amount-pay').text().trim().replace(/\s+/g, '')),
      status: $tr.find('td.status').text().trim()
    }

    bills.push(bill)

    // 通过「操作」里的「备注」链接获取到精确度到秒的时间戳
    const link = $tr.find('.action [data-action="edit-memo"]').attr('data-link')
    const match = link && link.match(/&createDate=\s*(\d+)/)
    const createDateStr = match ? match[1] : null
    if (createDateStr) {
      const year = Number(createDateStr.slice(0, 4))
      const month = Number(createDateStr.slice(4, 6)) - 1
      const day = Number(createDateStr.slice(6, 8))
      const hour = Number(createDateStr.slice(8, 10))
      const minute = Number(createDateStr.slice(10, 12))
      const second = Number(createDateStr.slice(12, 14))
      bill.createTime = new Date(year, month, day, hour, minute, second).getTime()
    }

    // 获取账单的订单号、交易号或流水号。
    // 个人对个人的账单只有流水号，
    // 个人与商户之间的交易会有订单号和交易号。
    // 支付宝对交易号和流水号是同等对待的。
    const tradeStr = $tr.find('td.tradeNo').text().trim()
    const nos = tradeStr.split('|')

    nos.forEach(noStr => {
      const [key, value] = noStr.trim().split(':')
      switch (key) {
        case '交易号':
        case '流水号':
          bill.tradeNo = value
          break
        case '订单号':
          bill.orderNo = value
          break
          // 忽略其它情况
      }
    })
  })

  return bills
}

/**
 * 监听事件
 * @param {string} name
 * @param {function} handler
 */
export function on (name: string, handler: (...args: any[]) => any) {
  event.on(name, handler)
}

/**
 * 使用指定的用户名和密码开始循环读取数据
 * @param {string} user - 用户名
 * @param {string} pwd - 密码
 */
export async function start (user: string, pwd: string) {
  if (!stopped) await stop()
  const loginPromise = login(user, pwd)
  loginPromise.then(refresh)
  return loginPromise
}

/**
 * 停止刷新
 * @return {Promise<void>}
 */
export async function stop () {
  if (!driver) return
  stopped = true
  return refreshing
}
