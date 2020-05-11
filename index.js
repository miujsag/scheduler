require("dotenv").config();
const { CronJob } = require("cron");
const { createSearchClient, setup } = require("search");
const rss = require("./lib/rss");
const weather = require("./lib/weather");
const rate = require("./lib/rate");
const day = require("./lib/day");
const client = createSearchClient(process.env.HOST, process.env.LOG);

setup(client)
  .then(function () {
    rss.run(client);
    weather.run();
    rate.run();
    day.run();

    new CronJob("*/5 * * * *", function () {
      rss.run(client);
    }).start();

    new CronJob("*/30 * * * *", function () {
      weather.run();
    }).start();

    new CronJob("0 12 * * *", function () {
      rate.run();
    }).start();

    new CronJob("0 0 * * *", function () {
      day.run();
    }).start();
  })
  .catch(console.log);
