function waitASec() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 1000);
  });
}

function waitAMinute() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 60000);
  });
}
module.exports = {
  waitASec,
  waitAMinute,
};
