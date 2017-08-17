import driver from '../utils/driver'
import ensure from '../utils/ensure-in-bill'

export interface Bill {
  day: string
  time: string
  name: string
  orderNo: string
  target: string
  amount: string
  status: string
}

/**
 * 这个函数会运行在浏览器里通过 DOM 分析出账单数据
 */
function getBills () {
  const bills: Bill[] = []

  // 支付宝网站用了 jQuery 所以这里可以使用
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

/**
 * 查询账单数据
 */
export default async function () {
  await ensure()
  return (driver.executeScript(getBills) as Promise<Bill[]>)
}
