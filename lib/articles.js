require("dotenv").config();
const { Article, Site, Reference, Keyword, Sequelize } = require("db");
const { Op } = Sequelize;
const maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS) || 16;

// scrape

function groupItems(items, limit) {
  const groups = [];
  let currentGroup = [];

  items.forEach(function (item) {
    currentGroup.push(item);

    if (currentGroup.length === limit) {
      groups.push(currentGroup);
      currentGroup = [];
    }
  });

  if (currentGroup.length) {
    groups.push(currentGroup);
  }

  return groups;
}

async function classifyArticles(articleGroups, categoryClassifier) {
  const [group, ...remainingGroups] = articleGroups;

  try {
    await Promise.all(
      group.map((article) => classifyArticle(article, categoryClassifier))
    );
  } catch (error) {
    console.log(error);
  } finally {
    if (remainingGroups.length) {
      await classifyArticles(remainingGroups, categoryClassifier);
    }
  }
}

async function classify(categoryClassifier) {
  try {
    const articles = await Article.findAllBy(
      {
        is_content_extracted: true,
        category_id: null,
      },
      1000
    );

    const articleGroups = groupItems(articles, maxConcurrentJobs);

    await classifyArticles(articleGroups, categoryClassifier);
  } catch (error) {
    console.log(error);
  }
}

module.exports = {
  scrape,
  classify,
};
