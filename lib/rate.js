const {scrapeRate} = require('scraper')
const {Bank, Rate} = require('db')

function run () {
  console.log('rate')

  return Bank.lists()
    .then(banks => Promise.all(banks.map(processRate)))
    .catch(console.log)
}

async function processRate (bank) {
  try {
    const rates = await Rate.lists(bank.id)
    const scrapedRates = await scrapeRate(bank.name)
    
    if (rates && rates.length > 0) {
      await updateRates(rates, scrapedRates)
    } else {
      await createRates(scrapedRates, bank)
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

function createRates (rates, bank) {
  return Promise.all(rates.map(rate => Rate.create(rate, bank)))
}

function updateRates (rates, newRates) {
  return Promise.all(rates.map(rate => {
    const currentRate = newRates.find(newRate => newRate.currency === rate.currency)
    
    return Rate.update(rate, currentRate)
  }))
}

module.exports = {
  run
}
