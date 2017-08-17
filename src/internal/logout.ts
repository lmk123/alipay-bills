import { URLs } from '../utils/constants'
import driver from '../utils/driver'
import state from '../internal/state'

/**
 * 退出登录
 */
export default async function () {
  if (state.logged) {
    await driver.get(URLs.logout)
    state.logged = false
  }
}
