const { Article, Category, Site, Sequelize } = require("db");
const Classifier = require("classifier")();
const Scraper = require("scraper")();
const { waitASec, waitAMinute } = require("../utils");

const { Op } = Sequelize;
let articles = [];

function cleanObject(object) {
  if (typeof object !== "object") {
    return {};
  }

  for (const propName in object) {
    if (
      object[propName] === null ||
      object[propName] === undefined ||
      object[propName] === ""
    ) {
      delete object[propName];
    }
  }
  return object;
}

function shuffleArticles(articleGroups) {
  const shuffledArticles = [];
  const longestLength = articleGroups.sort((a, b) => b.length - a.length)[0]
    .length;

  if (!longestLength) {
    return [];
  }

  for (let i = 0; i < longestLength; i++) {
    articleGroups.forEach(function (group) {
      const article = group[i];

      if (article) {
        shuffledArticles.push(article);
      }
    });
  }

  return shuffledArticles;
}

async function classifyArticle(article, categoryClassifier) {
  try {
    const textCandidate =
      article.content || article.description || article.title;

    const category = categoryClassifier.extractFromContent(null, textCandidate);

    if (category) {
      await Article.update(article, { category_id: category.id });
    }
  } catch (error) {
    console.log(error);

    return error;
  }
}

async function scrapeArticles(articles, previousArticle, categoryClassifier) {
  const [article, ...remainingArticles] = articles;

  try {
    if (previousArticle && article.site_id === previousArticle.site_id) {
      await waitASec();
    }

    if (article.site.ArticleSelector) {
      const scrapedArticle = await Scraper.Article.scrape(article.url, {
        content: article.site.ArticleSelector.content,
      });

      if (scrapedArticle && scrapedArticle.html) {
        const updatedArticle = await Article.update(
          article,
          cleanObject(scrapedArticle)
        );

        await classifyArticle(updatedArticle, categoryClassifier);
        await Article.update(updatedArticle, { is_content_extracted: true });
      }
    }
  } catch (error) {
    console.log(error);
    await Article.update(article, {
      scrape_attempts: article.scrape_attempts + 1,
    });
  } finally {
    if (remainingArticles.length) {
      await scrapeArticles(remainingArticles, article, categoryClassifier);
    }
  }
}

async function scrape(sites, categoryClassifier) {
  console.log("run scrape job", new Date());
  let articlesLength = 0;

  try {
    articles = await Promise.all(
      sites.map(async (site) => {
        const articles = await Article.findAllBy(
          {
            site_id: site.id,
            is_content_extracted: false,
            scrape_attempts: {
              [Op.lt]: 3,
            },
          },
          10,
          true
        );

        return articles.map((article) => {
          article.site = site;

          return article;
        });
      })
    );

    articles = shuffleArticles(articles);
    articlesLength = articles.length;

    if (articlesLength) {
      await scrapeArticles(articles, null, categoryClassifier);
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (!articlesLength) {
      await waitAMinute();
    }

    return await scrape(sites, categoryClassifier);
  }
}

async function run() {
  try {
    const [sites, categories] = await Promise.all([
      Site.lists("active"),
      Category.lists(),
    ]);

    const categoryClassifier = Classifier.Category(categories);

    await scrape(sites, categoryClassifier);
  } catch (error) {
    console.log(error);
  }
}

run();
