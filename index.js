const { CronJob } = require('cron')
const db = require('db')
const rss = require('./lib/rss')
const weather = require('./lib/weather')
const rate = require('./lib/rate')

db.init()
rss.run()
weather.run()
rate.run()

new CronJob('* * * * *', function () {
  rss.run()
}).start()

new CronJob('*/5 * * * *', function () {
  weather.run()
}).start()

new CronJob('0 12 * * *', function () {
  rate.run()
}).start()
