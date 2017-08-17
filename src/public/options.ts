/**
 * 一些设置项，会抛出去供用于修改
 */
export default {
  debug: false, // 开启 debug 模式后，会在控制台输出一些信息。
  // TODO：补充更多的参数
  pageParams: { // 账单页支持一些参数可以提供更准确的账单数据，默认只显示转账数据
    // status: 'success', // 交易状态
    // fundFlow: 'in', // 资金流向
    // tradeModes: 'FP', // 交易方式：即时到账
    // tradeType: 'TRANSFER', // 交易分类：转账
    // page: 1 // 页数
  }
}
