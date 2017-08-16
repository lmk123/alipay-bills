import selenium = require('selenium-webdriver')
const phantomjs = require('phantomjs-prebuilt')

const phantomjsPath = phantomjs.path
const customPhantom = selenium.Capabilities.phantomjs()
customPhantom.set('phantomjs.binary.path', phantomjsPath)
customPhantom.set('phantomjs.page.settings.userAgent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36')

export = new selenium.Builder().withCapabilities(customPhantom).build()
