require('dotenv').config()
const {scrapeRSS, scrapeArticle} = require('scraper')
const {Site, Category, Article} = require('db')
const {extractCategoryFromCandidates, extractCategoryFromUrl} = require('classifier')
const {createSearchClient, indexDocument} = require('search')

const client = createSearchClient(process.env.HOST, process.env.LOG)

async function run () {
  try {
    console.log('rss')
    const [sites, categories] = await Promise.all([
      Site.lists(),
      Category.lists()
    ])

    await Promise.all(sites.map(site => processArticles(site, categories)))
    console.log('rss finished')
  } catch (error) {
    console.log(error.message)
  }
}

function processArticles (site, categories) {
  return scrapeRSS(site.feed)
    .then(articles => saveArticles(articles, site, categories))
    .then(filterArticles)
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
    console.log(site.name)
    console.log(articles)
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
        const category = extractCategoryFromCandidates(null, scrapedArticle.category, categories)

        const updatedArticle = await Article.update(article, scrapedArticle, category)
        await indexDocument(client, updatedArticle)
      }
    }
  } catch (error) {
    console.log(error.message)
    throw new Error(error.message)
  }
}

function filterArticles (articles) {
  return articles.filter(article =>  article && article.url)
}

module.exports = {
  run
}
