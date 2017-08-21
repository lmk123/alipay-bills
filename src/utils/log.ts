import { writeFile } from 'fs'
import options from '../public/options'
import driver from './driver'

/**
 * 根据配置判断要不要输出日志
 */
export default async function (msg: any, capture?: any) {
  if (options.debug) {
    const date = new Date()
    console.log(`[${date.toLocaleString()}]`, msg)
    if (capture) {
      const imageBase64Str = await driver.takeScreenshot()
      writeFile(date.getTime() + '.jpg', imageBase64Str, 'base64', () => {})
    }
  }
}
