import { promise } from 'selenium-webdriver'
import Timer = NodeJS.Timer

export = function (condition: () => promise.Promise<any>, timeout = 5000) {
  return new Promise((resolve, reject) => {
    let retryId: Timer

    const timeoutId = setTimeout(() => {
      clearTimeout(retryId)
      reject()
    }, timeout)

    function retry () {
      condition().then(ok => {
        if (ok) {
          clearTimeout(timeoutId)
          resolve()
        } else {
          retryId = setTimeout(retry, 100)
        }
      })
    }

    retry()
  })
}
