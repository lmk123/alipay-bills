import state from '../internal/state'
import logout from '../internal/logout'

/**
 * 重新设置当前用户
 */
export default async function (user: string, pwd: string) {
  if (state.user === user && state.pwd === pwd) return
  if (state.logged) {
    await logout()
  }
  state.user = user
  state.pwd = pwd
}
