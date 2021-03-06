const Scraper = require("scraper")();
const { Bank, Rate } = require("db");
const { createLogMessage, logError, logInfo } = require("logger");
const Frontend = require("./frontend");

function run() {
  logInfo('"run rates" job started');

  return Bank.lists()
    .then((banks) => Promise.all(banks.map(processRate)))
    .then(() => logInfo('"run rates" job finished'))
    .catch((error) =>
      logError(
        new Error(
          createLogMessage({
            job: '"run rates" job failed',
            message: error.message,
          })
        )
      )
    );
}

async function processRate(bank) {
  try {
    const rates = await Rate.lists(bank.id);
    const scrapedRates = await Scraper.Rate.scrape(bank.name);
    const filteredRates = rates.filter(
      (rate) => rate.currency === "EUR" || rate.currency === "GBP"
    );

    await Frontend.update("rates", filteredRates);

    if (rates && rates.length > 0) {
      await updateRates(rates, scrapedRates);
    } else {
      await createRates(scrapedRates, bank);
    }
  } catch (error) {}
}

function createRates(rates, bank) {
  return Promise.all(rates.map((rate) => Rate.create(rate, bank)));
}

function updateRates(rates, newRates) {
  return Promise.all(
    rates.map((rate) => {
      const currentRate = newRates.find(
        (newRate) => newRate.currency === rate.currency
      );

      return Rate.update(rate, currentRate);
    })
  );
}

module.exports = {
  run,
};
