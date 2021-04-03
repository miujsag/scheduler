const cheerio = require("cheerio");
const fs = require("fs");
const { promisify } = require("util");
const { createLogMessage, logError } = require("logger");

const folder = process.env.FRONTEND_FOLDER;

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const indexPath = `${folder}/index.html`;
const searchPath = `${folder}/kereses/index.html`;

async function update(key, value) {
  if (!fs.existsSync(indexPath) || !fs.existsSync(searchPath)) {
    return;
  }

  try {
    const [index, search] = await Promise.all([
      readFile(indexPath, "utf8"),
      readFile(searchPath, "utf8"),
    ]);

    Promise.all([
      await updatePage(index, key, value, indexPath),
      await updatePage(search, key, value, searchPath),
    ]);
  } catch (error) {
    logError(
      new Error(
        createLogMessage({
          job: '"run rates" job failed',
          message: error.message,
        })
      )
    );
  }
}

async function updatePage(html, key, value, path) {
  try {
    const $ = cheerio.load(html);

    const scriptTag = $("#__NEXT_DATA__");
    const json = JSON.parse(scriptTag.html());
    const oldValue = json.props.pageProps[key];

    if (value && oldValue !== value) {
      json.props.pageProps[key] = value || oldValue;

      scriptTag.html(JSON.stringify(json));

      if (key === "weather") {
        $(".weather").attr("title", value.description);
        $(".weather p").text(`${value.current_temperature}&#xB0;C`);
        $(".weather img").attr("src", `images/weather/${value.icon}.svg`);
      }

      return writeFile(path, $.html(), "utf8");
    }
  } catch (error) {
    throw new Error(error);
  }
}

module.exports = {
  update,
};
