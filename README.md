# alipay-bills

一个用于自动获取支付宝账单信息的 Node.js 模块。

## 安装

```
npm install alipay-bills
```

## 使用

alipay-bills 只有两个方法：

```js
const alipayBills = require('alipay-bills')

alipayBills.options.debug = true // 在控制台输出日志

// alipayBills 的接口都是异步的，强烈推荐使用 async/await 语法
;(async function () {
  // 请确保你的用户名和密码是正确的，否则会无限重试登录。
  // 如果你已经登录过了，重新调用这个方法会先将已经登录的账号退出。
  await alipayBills.setUser('用户名', '密码')
  await alipayBills.query().then(bills => {
    // bills 是一个数组，数组中每一项的结构为：
    //{
    //  day: string - 日期，如 '2017.08.15'
    //  time: string - 具体时间，如 '04:10'
    //  name: string - 对应「我的账单高级版」的「名称」
    //  orderNo: string - 对应「我的账单高级版」的「商户订单号|交易号」
    //  target: string - 对应「我的账单高级版」的「对方」
    //  amount: string - 对应「我的账单高级版」的「金额」
    //  status: string - 对应「我的账单高级版」的「状态」
    //}
  })
}())
```

## 原理

使用 Selenium 操作 PhantomJS 模拟用户登陆，进入「我的账单」页获取账单数据。

代码参考了[利用『爬虫』 折衷解决 个人支付宝支付系统 ---- 获取账单信息](https://www.v2ex.com/t/383179)这篇帖子。

## 许可

MIT
