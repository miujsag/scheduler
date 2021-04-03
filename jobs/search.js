const { Article } = require("db");
const { connect, indexDocument } = require("search");
const { waitAMinute } = require("../utils");

let articles = [];

async function indexArticles(articles, elasticSearchClient) {
  const [article, ...remainingArticles] = articles;

  try {
    const result = await indexDocument(elasticSearchClient, article);
    if (result && result.body?.result === "created") {
      await Article.update(article, {
        is_indexed: true,
      });
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (remainingArticles.length) {
      await indexArticles(remainingArticles, elasticSearchClient);
    }
  }
}

async function index(elasticSearch) {
  console.log("run search job", new Date());
  let articlesLength = 0;

  try {
    articles = await Article.findAllBy(
      {
        is_content_extracted: true,
        is_indexed: false,
      },
      1000,
      true,
      true
    );

    articlesLength = articles.length;

    if (articlesLength) {
      await indexArticles(articles, elasticSearch);
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (!articlesLength) {
      await waitAMinute();
    }

    return await index(elasticSearch);
  }
}

async function run() {
  try {
    const elasticSearch = await connect(process.env.HOST);

    await index(elasticSearch);
  } catch (error) {
    console.log(error);
  }
}

run();
