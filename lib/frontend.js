const cheerio = require("cheerio");
const fs = require("fs");
const { promisify } = require("util");
const { createLogMessage, logError } = require("logger");

const folder = process.env.FRONTEND_FOLDER;

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function update(key, value) {
  try {
    const [index, search] = await Promise.all([
      readFile(`${folder}/index.html`, "utf8"),
      readFile(`${folder}/kereses/index.html`, "utf8"),
    ]);

    Promise.all([
      await updatePage(index, key, value, `${folder}/index.html`),
      await updatePage(search, key, value, `${folder}/kereses/index.html`),
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
