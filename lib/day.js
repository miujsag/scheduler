const { Day } = require("db");
const { createLogMessage, logError, logInfo } = require("logger");
const Frontend = require("./frontend");

function run() {
  logInfo('"run day" job started');

  Day.today()
    .then((day) => Frontend.update("day", day))
    .catch((error) =>
      logError(
        new Error(
          createLogMessage({
            job: '"run rates" job failed',
            message: error.message,
          })
        )
      )
    );
}

module.exports = {
  run,
};
