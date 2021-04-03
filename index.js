require("dotenv").config();
const { CronJob } = require("cron");
const { Site, Category } = require("db");
const { fork } = require("child_process");

const Classifier = require("classifier")();
const rss = require("./lib/rss");
const weather = require("./lib/weather");
const rate = require("./lib/rate");
const day = require("./lib/day");

async function run() {
  try {
    const [sites, categories] = await Promise.all([
      Site.lists("active"),
      Category.lists(),
    ]);

    const categoryClassifier = Classifier.Category(categories);

    rss.run(sites, categoryClassifier);
    weather.run();
    rate.run();
    day.run();

    fork("./jobs/keyword.js");
    fork("./jobs/reference.js");
    fork("./jobs/scrape.js");
    fork("./jobs/search.js");

    new CronJob("*/5 * * * *", function () {
      rss.run(sites, categoryClassifier);
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
  } catch (error) {
    console.log(error);
  }
}

run();
