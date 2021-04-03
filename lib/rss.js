require("dotenv").config();
const Scraper = require("scraper")();
const { Article } = require("db");
const { createLogMessage, logError, logInfo } = require("logger");

async function run(sites, categoryClassifier) {
  const [site, ...remainingSites] = sites;

  try {
    await processArticles(site, categoryClassifier);
  } catch (error) {
    console.log(error);
    logError(
      new Error(
        createLogMessage({
          job: '"run rss" job failed',
          message: error,
        })
      )
    );
  } finally {
    if (remainingSites.length) {
      return await run(remainingSites, categoryClassifier);
    }
    logInfo('"run rates" job finished');
  }
}

function processArticles(site, categoryClassifier) {
  return Scraper.RSS.scrape(site.feed).then((articles) =>
    saveArticles(articles, site, categoryClassifier)
  );
}

function classifyArticle(article, categoryClassifier) {
  return categoryClassifier.extractFromCandidates(
    categoryClassifier.extractFromUrl(null, article.url),
    article.categoryCandidates
  );
}

function saveArticles(articles, site, categoryClassifier) {
  if (!articles || articles.length < 1) {
    return [];
  }

  return Promise.all(
    articles.map(function (article) {
      const category = classifyArticle(article, categoryClassifier);

      return Article.create({
        ...article,
        site_id: site.id,
        category_id: category ? category.id : null,
      });
    })
  );
}

module.exports = {
  run,
};
