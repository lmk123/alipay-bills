# alipay-bills

一个用于自动获取支付宝账单信息的 Node.js 模块。

## 安装

```
npm install alipay-bills
```

## 使用

alipay-bills 只有三个方法：

```js
const alipayBills = require('alipay-bills')

alipayBills.options.debug = true // 在控制台输出日志
alipayBills.options.interval = 5000 // 间隔多久刷新一次，默认是 60000 毫秒（即一分钟）
alipayBills.options.params = { // 自定义「我的账单」页面的查询参数，默认没有任何参数。具体有哪些参数可以通过 Chrome 开发者工具分析得出。
  // 部分参数举例：
  status: 'success', // 交易状态：成功
  fundFlow: 'out' // 资金流向：支出
}

// alipayBills 的接口都是异步的，强烈推荐使用 async/await 语法
;(async function () {
  // 先监听 `new bills` 事件，每次检测到新账单时会触发这个事件
  alipayBills.on('new bills', bills => {
    // bills 是一个数组，数组中每一项的结构为：
    //{
    //  createTime: number - 精确到「秒」的创建时间戳
    //  memo: string - 对应「我的账单高级版」中的「备注」
    //  name: string - 对应「我的账单高级版」中的「名称」
    //  orderNo: string - 对应「我的账单高级版」的「订单号」，可能为空
    //  tradeNo: string - 对应「我的账单高级版」的「交易号」或者「流水号」
    //  target: string - 对应「我的账单高级版」的「对方」
    //  amount: number - 对应「我的账单高级版」的「金额」，正数代表收入，负数代表支出
    //  status: string - 对应「我的账单高级版」的「状态」
    //}
  })

  // 请确保你的用户名和密码是正确的，否则会无限重试登录。
  // 调用 start 方法后每隔一段时间（具体时间为前面设置的 `options.interval`）就会刷新一次并检测是否有新账单。
  // 第一次检测只会将「我的账单」高级版第一页的账单数据传给 `new bills` 事件，
  // 后续会循环查询每一页的账单数据，直到碰到上一次查询时的第一个账单信息为止。
  await alipayBills.start('用户名', '密码')

  // 停止刷新
  await alipayBills.stop()

  // 重新调用 start 方法会先退出前面登录过的账号
  await alipayBills.start('另一个用户名', '另一个密码')
}())
```

## 原理

使用 Selenium 操作 PhantomJS 模拟用户登陆，进入「我的账单」页获取账单数据。

部分代码参考了[利用『爬虫』 折衷解决 个人支付宝支付系统 ---- 获取账单信息](https://www.v2ex.com/t/383179)这篇帖子。

## 许可

MIT
