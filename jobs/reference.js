const { Article, Site, Reference } = require("db");
const { waitAMinute } = require("../utils");
const Classifier = require("classifier")();

const extractReferences = Classifier.Reference.extract;
let articles = [];
let references = [];

// reference
async function getReferences(articles) {
  const [article, ...remainingArticles] = articles;
  try {
    references = extractReferences(
      article.html,
      article.Site.ArticleSelector.content
    );

    for (const reference of references) {
      const site = await Site.findOrCreateByReference([
        reference.candidate,
        reference.origin,
      ]);
      const referenceArticle = await Article.findOrCreateByReference(
        reference.url,
        site
      );

      await Reference.create(referenceArticle, article, site);
    }

    await Article.update(article, { are_references_extracted: true });
  } catch (error) {
    console.log(error);
  } finally {
    if (remainingArticles.length) {
      await getReferences(remainingArticles, extractReferences);
    }
  }
}

async function reference() {
  console.log("run reference job", new Date());
  let articlesLength = 0;

  try {
    articles = await Article.findAllBy(
      {
        is_content_extracted: true,
        are_references_extracted: false,
      },
      100,
      true
    );

    articlesLength = articles.length;

    if (articlesLength) {
      await getReferences(articles, extractReferences);
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (!articlesLength) {
      await waitAMinute();
    }

    return await reference();
  }
}

async function run() {
  try {
    await reference();
  } catch (error) {
    console.log(error);
  }
}

run();
