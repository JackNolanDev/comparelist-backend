const axios = require('axios').default;
const cheerio = require('cheerio');
const fs = require('fs')

const HARDCOVER_FICTION = "hardcoverFiction";
const HARDCOVER_NONFICTION = "hardcoverNonfiction";
const PAPERBACK_FICTION = "paperbackFiction";
const PAPERBACK_NONFICTION = "paperbackNonfiction";

const NY_TIMES_API_URL = "https://api.nytimes.com/svc/books/v3";
const NY_TIMES_HARCOVER_FICTION = "/lists/current/hardcover-fiction.json";
const NY_TIMES_HARCOVER_NONFICTION = "/lists/current/hardcover-nonfiction.json";
const NY_TIMES_PAPERBACK_FICTION = "/lists/current/trade-fiction-paperback.json";
const NY_TIMES_PAPERBACK_NONFICTION = "/lists/current/paperback-nonfiction.json";

const INDIE_BOUND_URL = "https://www.indiebound.org/indie-bestsellers"

const nytimesAPI = async (route) => {
  return await axios
  .get(NY_TIMES_API_URL + route, {
    params: { "api-key": process.env.NY_TIMES_API_KEY },
  })
  .then((response) => {
    return response.data;
  });
};

const nytimesList = (data) => {
  const books = data.results.books.map((book) => {
    return {
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      desc: book.description,
      image: book.book_image,
      rank: book.rank,
      lastRank: book.rank_last_week,
      wol: book.weeks_on_list
    };
  });
  return {
    name: data.results.display_name,
    date: data.results.bestsellers_date,
    books,
  };
}

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

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  let day = date.getDate().toString();
  if (day.length < 2) {
    day = "0" + day;
  }
  let month = (date.getMonth() + 1).toString();
  if (month.length < 2) {
    month = "0" + month;
  }
  return `${date.getFullYear()}-${day}-${month}`;
}

const indieBoundDate = ($) => {
  const dateLine = $("#bestseller-lists-header > p").text();
  const dateStr = dateLine.match(/[a-zA-Z]+ \d+, \d\d\d\d/);
  if (!dateStr) {
    return undefined;
  }
  return formatDate(dateStr);
}

const indieBoundList = ($, el, name, date) => {
  const books = [];
  const carouselElements = $(el).find(".carousel-cell")
  carouselElements.each((idx, el) => {
    const image = $(el).children('img').eq(0).attr('src');
    const titleText = $(el).find(".book-title").text();
    const authorText = $(el).find(".book-author").text();
    const lastRankText = $(el).find(".book-rank").text();
    const wolText = $(el).find(".book-wol").text();
    const publisher = $(el).find(".book-publisher").text();
    const desc = $(el).find(".book-description").text();

    const numberMatch = titleText.match(/#\d+: /);
    const title = numberMatch ? titleText.substring(numberMatch[0].length) : titleText;
    const author = authorText && authorText.length > 3 ? authorText.substring(3) : authorText;
    const lastRankInt = parseInt(lastRankText && lastRankText.length > 16 ? lastRankText.substring(16) : lastRankText);
    const lastRank = isNaN(lastRankInt) ? 0 : lastRankInt;
    const wolStr = parseInt(wolText && wolText.length > 15 ? wolText.substring(15) : wolText);
    const wol = isNaN(wolStr) ? 0 : wolStr;

    const book = {
      title,
      author,
      publisher,
      desc,
      image,
      rank: idx + 1,
      lastRank,
      wol
    };
    books.push(book);
  })
  return {
    name,
    date,
    books
  }
}

const getIndieBoundData = async () => {
  const indieBoundLists = {};
  const page = await axios.get(INDIE_BOUND_URL).then((res) => res.data);
  // const page = fs.readFileSync('./indie.html', 'utf8');
  const $ = cheerio.load(page);

  const date = indieBoundDate($);

  const lists = [
    [HARDCOVER_FICTION, "Hardcover Fiction Bestsellers"],
    [HARDCOVER_NONFICTION, "Hardcover Nonfiction Bestsellers"],
    [PAPERBACK_FICTION, "Trade Paperback Fiction Bestsellers"],
    [PAPERBACK_NONFICTION, "Trade Paperback Nonfiction Bestsellers"],
  ]

  const carousels = $("#indie-bestsellers").find(".owl-carousel");
  carousels.each((idx, el) => {
    if (idx < lists.length) {
      indieBoundLists[lists[idx][0]] = indieBoundList($, el, lists[idx][1], date);
    }
  })

  return indieBoundLists;
}

const updateLists = async (lists) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("running poller!");
  }

  lists.nyt = await getNYTimesData();
  lists.indie = await getIndieBoundData();

  if (process.env.NODE_ENV !== "production") {
    console.log("done running poller!");
  }
}

module.exports = {
  updateLists
}
