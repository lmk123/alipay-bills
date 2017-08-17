import { WebElementPromise } from 'selenium-webdriver'

import driver from '../utils/driver'

/**
 * 模拟真实的人类输入行为，即输入两个字符之间需要一点时间间隔
 */
export default async function (ele: WebElementPromise, str: string) {
  await ele.clear()
  for (let i = 0; i < str.length; i++) {
    await ele.sendKeys(str[i])
    await driver.sleep(500)
  }
}
