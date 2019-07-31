require('dotenv').config()
const {scrapeRSS, scrapeArticle} = require('scraper')
const {Site, Category, Article} = require('db')
const {createError, logError, logInfo} = require('logger')
const {extractCategoryFromCandidates, extractCategoryFromUrl, extractCategoryFromContent} = require('classifier')
const {createSearchClient, indexDocument} = require('search')

const client = createSearchClient(process.env.HOST, process.env.LOG)

async function run () {
  try {
    logInfo('"run rss" job started')

    const [sites, categories] = await Promise.all([
      Site.lists(),
      Category.lists()
    ])

    await Promise.all(sites.map(site => processArticles(site, categories)))
    logInfo('"run rates" job finished')
  } catch (error) {
    logError(createError({
      job: '"run rss" job failed',
      message: error.message
    }))
  }
}

function processArticles (site, categories) {
  return scrapeRSS(site.feed)
    .then(articles => saveArticles(articles, site, categories))
    .then(articles => articles.filter(article => article && article.url))
    .then(articles => scrapeArticles(articles, site, categories))
}

function classifyArticle (article, categories) {
  return extractCategoryFromCandidates(
    extractCategoryFromUrl(null, article.url, categories),
    article.categoryCandidates,
    categories
  )
}

function saveArticles (articles, site, categories) {
  if (!articles || articles.length < 1) {
    return []
  }

  return Promise.all(articles.map(function (article) {
    const category = classifyArticle(article, categories)

    return Article.create(article, site, category)
  }))
}

async function scrapeArticles (articles, site, categories) {
  const newArticles = articles.filter(article => article.title)

  try {
    for (const article of newArticles) {
      const scrapedArticle = await scrapeArticle(article.url, site.article_selector)

      if (scrapedArticle && scrapedArticle.html) {
        const category = extractCategoryFromContent(
          extractCategoryFromCandidates(null, scrapedArticle.category, categories),
          scrapedArticle.content, categories
        )

        const updatedArticle = await Article.update(article, scrapedArticle, category)

        await indexDocument(client, updatedArticle, site, category)
      }
    }
  } catch (error) {
  }
}

module.exports = {
  run
}
