import options from '../public/options'
import driver from './driver'
import * as fs from 'fs'

/**
 * 根据配置判断要不要输出日志
 */
export default async function (msg: any, capture?: any) {
  if (options.debug) {
    const date = new Date()
    console.log(`[${date.toLocaleString()}]`, msg)
    if (capture) {
      const imageBase64Str = await driver.takeScreenshot()
      fs.writeFile(date.getTime() + '.jpg', imageBase64Str, 'base64', () => {})
    }
  }
}
