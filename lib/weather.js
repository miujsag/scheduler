const { scrapeWeather } = require('scraper')
const { Weather } = require('db')

function run () {
  console.log('weather')

  return Weather.lists()
    .then(items => Promise.all(items.map(processWeather)))
    .catch(console.log)
}

function processWeather (weather) {
  return scrapeWeather(weather.openweatherId, process.env.OPENWEATHER_KEY)
    .then(scrapedWeather => Weather.update(weather, scrapedWeather))
}

module.exports = {
  run
}
