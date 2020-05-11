const Scraper = require("scraper")();
const { Weather } = require("db");
const { createLogMessage, logError, logInfo } = require("logger");
const Frontend = require("./frontend");

function run() {
  logInfo('"run weather" job started');

  return Weather.lists()
    .then((items) => Promise.all(items.map(processWeather)))
    .then(() => logInfo('"run weather" job finished'))
    .catch((error) =>
      logError(
        new Error(
          createLogMessage({
            job: '"run weather" job failed',
            message: error.message,
          })
        )
      )
    );
}

async function processWeather(weather) {
  try {
    const scrapedWeather = await Scraper.Weather.scrape(
      weather.openweather_id,
      process.env.OPENWEATHER_KEY
    );

    await Weather.update(weather, scrapedWeather);

    if (weather.city === "Budapest") {
      Frontend.update("weather", scrapedWeather);
    }
  } catch (error) {
    return new Error(error);
  }
}

module.exports = {
  run,
};
