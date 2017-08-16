import { promise, WebElementPromise } from 'selenium-webdriver'

import driver = require('./driver')
import wait = require('./wait')

const URLs = {
  login: 'https://auth.alipay.com/login/index.htm',
  logout: 'https://auth.alipay.com/login/logout.htm',
  billsIndex: 'https://consumeprod.alipay.com/record/index.htm',
  billsStandard: 'https://consumeprod.alipay.com/record/standard.htm',
  billsAdvanced: 'https://consumeprod.alipay.com/record/advanced.htm',
  billsSwitch: 'https://consumeprod.alipay.com/record/switchVersion.htm'
}

namespace AlipayBills {
  let logged: boolean
  let innerUser: string
  let innerPwd: string

  function slowInput (ele: WebElementPromise, str: string) {
    return new Promise(resolve => {
      let index = 0

      function sendChar () {
        const char = str[index]
        ele.sendKeys(char).then(() => {
          setTimeout(() => {
            index += 1
            if (index === str.length) {
              resolve()
            } else {
              sendChar()
            }
          }, 500)
        })
      }

      ele.clear().then(sendChar)
    })
  }

  export function setUser (user: string, pwd: string) {
    innerUser = user
    innerPwd = pwd
  }

  function login (): promise.Promise<void> {
    if (logged) return Promise.resolve() as promise.Promise<void>
    console.log('正在跳转到登陆页……')
    return driver.get(URLs.login + '?goto=' + encodeURIComponent(URLs.billsAdvanced))
        .then(() => {
          console.log('正在输入用户名……')
          const userEle = driver.findElement({ id: 'J-input-user' })
          return slowInput(userEle, innerUser)
        })
        .then(() => {
          console.log('正在输入密码……')
          const pwdEle = driver.findElement({ id: 'password_rsainput' })
          return slowInput(pwdEle, innerPwd)
        })
        .then(() => {
          console.log('正在点击登陆按钮……')
          return new Promise((res, rej) => {
            setTimeout(() => {
              const retryId = setTimeout(() => {
                console.log('点击登陆按钮无反应，即将重试。')
                rej()
              }, 5000)

              const loginEle = driver.findElement({ id: 'J-login-btn' })
              loginEle.click().then(() => {
                clearTimeout(retryId)
                res()
              }, () => {
                rej()
              })
            }, 500)
          })
        })
        .then(() => {
          console.log('正在等待浏览器跳转到账单页……')
          return wait(() => driver.getTitle().then(title => title === '我的账单 - 支付宝'))
        })
        .then(() => {
          return new Promise(resolve => {
            // 高级版有 #main，标准版没有
            driver.findElements({ id: 'main' }).then(elements => {
              if (elements.length) {
                resolve()
              } else {
                console.log('检测到当前是标准版账单页，正在跳转到高级版账单页……')
                driver
                    .get(URLs.billsSwitch)
                    .then(() => {
                      return wait(() => driver.findElements({ id: 'main' }).then(elements => elements.length > 0))
                    })
                    .then(resolve)
              }
            })
          })
        })
        .then(() => {
          console.log('登陆成功')
          logged = true
        })
        .catch(() => {
          console.log('尝试登陆时失败，正在重试……')
          return login()
        })
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

  function getBills () {
    const bills: Bill[] = []

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

  export function query () {
    return (login().then(() => driver.executeScript(getBills)) as Promise<Bill[]>)
  }
}

export = AlipayBills
