const {scrapeWeather} = require('scraper')
const {Weather} = require('db')
const {createLogMessage, logError, logInfo} = require('logger')

function run () {
  logInfo('"run weather" job started')

  return Weather.lists()
    .then(items => Promise.all(items.map(processWeather)))
    .then(() => logInfo('"run weather" job finished'))
    .catch(error => logError(new Error(createLogMessage({
      job: '"run weather" job failed',
      message: error.message
    }))))
}

function processWeather (weather) {
  return scrapeWeather(weather.openweatherId, process.env.OPENWEATHER_KEY)
    .then(scrapedWeather => Weather.update(weather, scrapedWeather))
}

module.exports = {
  run
}
