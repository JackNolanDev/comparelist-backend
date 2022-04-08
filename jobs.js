const axios = require('axios').default;
const cheerio = require('cheerio');

const HARDCOVER_FICTION = "hardcoverFiction";
const HARDCOVER_NONFICTION = "hardcoverNonfiction";
const PAPERBACK_FICTION = "paperbackFiction";
const PAPERBACK_NONFICTION = "paperbackNonfiction";

const NY_TIMES_API_URL = "https://api.nytimes.com/svc/books/v3";
const NY_TIMES_HARCOVER_FICTION = "/lists/current/hardcover-fiction.json";
const NY_TIMES_HARCOVER_NONFICTION = "/lists/current/hardcover-nonfiction.json";
const NY_TIMES_PAPERBACK_FICTION = "/lists/current/mass-market-paperback.json";
const NY_TIMES_PAPERBACK_NONFICTION = "/lists/current/paperback-nonfiction.json";
const NY_TIMES_API_KEY = process.env.NY_TIMES_API_KEY;

const nytimesList = (data) => {
  const books = data.results.books.map((book) => {
    return {
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      desc: book.description,
      image: book.book_image,
      rank: book.rank,
      rankLastWeek: book.rank_last_week,
      weeksOnList: book.weeks_on_list
    };
  });
  return {
    name: data.results.display_name,
    date: data.results.bestsellers_date,
    books,
  };
}

const nytimesAPI = async (route) => {
  return await axios
  .get(NY_TIMES_API_URL + route, {
    params: { "api-key": NY_TIMES_API_KEY },
  })
  .then((response) => {
    return response.data;
  });
};

const getNYTimesData = async () => {
  const nytimesLists = {};
  const lists = [
    [HARDCOVER_FICTION, NY_TIMES_HARCOVER_FICTION],
    [HARDCOVER_NONFICTION, NY_TIMES_HARCOVER_NONFICTION],
    [PAPERBACK_FICTION, NY_TIMES_PAPERBACK_FICTION],
    [PAPERBACK_NONFICTION, NY_TIMES_PAPERBACK_NONFICTION],
  ];
  lists.forEach(async (pair) => {
    const data = await nytimesAPI(pair[1]);
    if (data.status === "OK") {
      nytimesLists[pair[0]] = nytimesList(data);
    }
  });
  return nytimesLists;
}

const updateLists = async (lists) => {
  console.log("running poller!");
  lists.nyt = await getNYTimesData();
  console.log("done running poller!");
}

module.exports = {
  updateLists
}
