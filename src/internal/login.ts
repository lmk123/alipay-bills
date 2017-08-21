import { stringify } from 'querystring'
import log from '../utils/log'
import driver from '../utils/driver'
import humanInput from '../utils/human-input'
import state from './state'
import options from '../public/options'
import { URLs, BillPageTitle } from '../utils/constants'
import { until } from 'selenium-webdriver'

const { titleIs } = until

/**
 * 使用当前的账号与密码登录
 */
async function login (): Promise<void> {
  try {
    // 跳转到登陆页
    await log('正在跳转到登陆页……')
    await driver.get(URLs.login + '?goto=' + encodeURIComponent(URLs.billsIndex + '?' + stringify(options.pageParams)))
    // 输入用户名
    await log('正在输入用户名……')
    await humanInput(driver.findElement({ id: 'J-input-user' }), state.user)
    // 输入密码
    await log('正在输入密码……')
    await humanInput(driver.findElement({ id: 'password_rsainput' }), state.pwd)
    // 点击登陆按钮
    await log('正在点击登陆按钮……')
    await driver.sleep(500)
    // 故意没有 await 下面的语句，这样 5 秒内检测到没跳转到账单页就重试
    driver.findElement({ id: 'J-login-btn' }).click()
    // 确认浏览器跳转到了账单页
    await log('正在等待浏览器跳转到账单页……')
    await driver.wait(titleIs(BillPageTitle), 5000, '5 秒内没有跳转到账单页')
    state.logged = true
    await log('登陆成功')
  } catch (e) {
    await log('尝试登陆时失败，正在重试……')
    console.error(e.message)
    return login()
  }
}

export default login
