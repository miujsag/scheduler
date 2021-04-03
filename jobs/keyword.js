const { Article, Keyword, Sequelize } = require("db");
const { extractKeywords } = require("keywords");
const { waitAMinute } = require("../utils");

const { Op } = Sequelize;
let articles = [];

async function getKeywords(articles) {
  const [article, ...remainingArticles] = articles;
  try {
    const uniqueEntries = await extractKeywords(article.content);
    await Promise.all(
      uniqueEntries.map((entry) => Keyword.create(entry, article))
    );
    await Article.update(article, {
      are_keywords_extracted: true,
    });
  } catch (error) {
    console.log(error);
  } finally {
    if (remainingArticles.length) {
      await getKeywords(remainingArticles);
    }
  }
}

async function keyword() {
  console.log("run keyword job", new Date());
  let articlesLength = 0;

  try {
    articles = await Article.findAllBy(
      {
        is_content_extracted: true,
        are_keywords_extracted: false,
        category_id: {
          [Op.ne]: null,
        },
      },
      100,
      true
    );

    articlesLength = articles.length;

    if (articlesLength) {
      await getKeywords(articles);
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (!articlesLength) {
      await waitAMinute();
    }

    return await keyword();
  }
}

async function run() {
  try {
    await keyword();
  } catch (error) {
    console.log(error);
  }
}

run();
