const updateLists = (lists) => {
  console.log("running poller!");
  lists[new Date().getTime()] = "hi";
}

module.exports = {
  updateLists
}
