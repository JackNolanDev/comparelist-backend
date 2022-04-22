const axios = require('axios').default;
const cheerio = require('cheerio');
const toTitleCase = require('to-title-case');
// const fs = require('fs')

const HARDCOVER_FICTION = "hardcoverFiction";
const HARDCOVER_NONFICTION = "hardcoverNonfiction";
const PAPERBACK_FICTION = "paperbackFiction";
const PAPERBACK_NONFICTION = "paperbackNonfiction";
const MASS_MARKET = "massMarket";
const PICTURE_BOOK = "pictureBook";
const ADVICE = "advice";

const NY_TIMES_API_URL = "https://api.nytimes.com/svc/books/v3";
const NY_TIMES_HARCOVER_FICTION = "/lists/current/hardcover-fiction.json";
const NY_TIMES_HARCOVER_NONFICTION = "/lists/current/hardcover-nonfiction.json";
const NY_TIMES_PAPERBACK_FICTION = "/lists/current/trade-fiction-paperback.json";
const NY_TIMES_PAPERBACK_NONFICTION = "/lists/current/paperback-nonfiction.json";
const NY_TIMES_MASS_MARKET = "/lists/current/mass-market-monthly.json";
const NY_TIMES_PICTURE_BOOK = "/lists/current/picture-books.json";
const NY_TIMES_ADVICE = "/lists/current/advice-how-to-and-miscellaneous.json";

const INDIE_BOUND_URL = "https://www.indiebound.org/indie-bestsellers";

const PUBLISHERS_HARDCOVER_FICTION_URL = "https://www.publishersweekly.com/pw/nielsen/hardcoverfiction.html";
const PUBLISHERS_HARDCOVER_NONFICTION_URL = "https://www.publishersweekly.com/pw/nielsen/HardcoverNonfiction.html";
const PUBLISHERS_PAPERBACK_FICTION_URL = "https://www.publishersweekly.com/pw/nielsen/tradepaper.html";
const PUBLISHERS_MASS_MARKET_URL = "https://www.publishersweekly.com/pw/nielsen/massmarket.html";
const PUBLISHERS_PICTURE_BOOK_URL = "https://www.publishersweekly.com/pw/nielsen/kidspicture.html";

const NY_TIMES_DISP = "The New York Times";
const INDIE_BOUND_DISP = "IndieBound";
const PUBLISHERS_DISP = "Publishers Weekly";

const WEEKLY_RATE = "weekly";

// ####################### NYTIMES #######################

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
      title: toTitleCase(book.title),
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
    rate: data.results.updated.toLowerCase(),
    books,
  };
}

const getNYTimesData = async () => {
  const nytimesLists = { disp: NY_TIMES_DISP };
  const lists = [
    [HARDCOVER_FICTION, NY_TIMES_HARCOVER_FICTION],
    [HARDCOVER_NONFICTION, NY_TIMES_HARCOVER_NONFICTION],
    [PAPERBACK_FICTION, NY_TIMES_PAPERBACK_FICTION],
    [PAPERBACK_NONFICTION, NY_TIMES_PAPERBACK_NONFICTION],
    [MASS_MARKET, NY_TIMES_MASS_MARKET],
    [PICTURE_BOOK, NY_TIMES_PICTURE_BOOK],
    [ADVICE, NY_TIMES_ADVICE],
  ];
  lists.forEach(async (pair) => {
    const data = await nytimesAPI(pair[1]);
    if (data.status === "OK") {
      nytimesLists[pair[0]] = nytimesList(data);
    }
  });
  return nytimesLists;
}

// ####################### Indie Bound #######################

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
  return `${date.getFullYear()}-${month}-${day}`;
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
    rate: WEEKLY_RATE,
    books
  }
}

const getIndieBoundData = async () => {
  const indieBoundLists = { disp: INDIE_BOUND_DISP };
  const page = await axios.get(INDIE_BOUND_URL).then((res) => res.data);
  // const page = fs.readFileSync('./indie.html', 'utf8');
  const $ = cheerio.load(page);

  const date = indieBoundDate($);

  const lists = [
    [HARDCOVER_FICTION, "Hardcover Fiction Bestsellers"],
    [HARDCOVER_NONFICTION, "Hardcover Nonfiction Bestsellers"],
    [PAPERBACK_FICTION, "Trade Paperback Fiction Bestsellers"],
    [PAPERBACK_NONFICTION, "Trade Paperback Nonfiction Bestsellers"],
    [MASS_MARKET, "Mass Market Bestsellers"],
    [PICTURE_BOOK, "Children's Illustrated Bestsellers"],
  ]

  const carousels = $("#indie-bestsellers").find(".owl-carousel");
  carousels.each((idx, el) => {
    if (idx < lists.length) {
      indieBoundLists[lists[idx][0]] = indieBoundList($, el, lists[idx][1], date);
    }
  })

  return indieBoundLists;
}

// ####################### Publishers Weekly #######################

const publishersList = (page) => {
  const $ = cheerio.load(page);
  const nameS = "#content-main > div.nielsen-wrapper > div.nielsen-right-column > div.nielsen-header.nielsen-individual";
  const name = $(nameS).eq(0).text();

  const dateS = "#content-main > div.nielsen-wrapper > div.nielsen-right-column > div:nth-child(5) > p:nth-child(1) > a";
  const linkWithDate = $(dateS).eq(0).attr('href');
  const dateRegex = /(january|february|march|april|may|june|july|august|september|october|november|december)-\d+-\d+/;
  const date = formatDate(linkWithDate.match(dateRegex));

  const books = [];
  const tableS = "#content-main > div.nielsen-wrapper > div.nielsen-right-column > table > tbody";
  const tableElements = $(tableS).children("tr");
  tableElements.each((idx, el) => {
    if (idx === 0) {
      return;
    }
    const book = {};
    const cols = $(el).children("td");
    cols.each((idx, el) => {
      switch (idx) {
        case 0:
          book.rank = parseInt($(el).text());
          break;
        case 1:
          const lastRank = parseInt($(el).text());
          book.lastRank = isNaN(lastRank) ? 0 : lastRank;
          break;
        case 2:
          book.wol = parseInt($(el).text());
          break;
        case 3:
          const info = $(el).children("div");
          info.each((idx, el) => {
            switch (idx) {
              case 0:
                // title
                const title = $(el).text().trim();
                book.title = title;
                break;
              case 1:
                // author
                const author = $(el).text().trim();
                book.author = author;
                break;
              case 2:
                // publisher
                const pub = $(el).text();
                const pubRegex = /, \$\d+.\d+ \(\d+\)/;
                try {
                  const publisher = pub.substring(0, pub.match(pubRegex).index);
                  book.publisher = publisher;
                } catch (e) {
                  book.publisher = "";
                }
                // cover image taken from open library using isbn
                const isbnRegex = /\d+-\d+-\d+-\d+-\d+/;
                try {
                  const isbn = pub.match(isbnRegex)[0];
                  const isbnNumber = isbn.replace(/-/g, "");
                  book.image = `https://covers.openlibrary.org/b/isbn/${isbnNumber}-M.jpg`
                } catch (e) {
                  // intentionally empty
                }
                break;
            }
          });
          break;
      }
    });

    books.push(book);
  });

  return {
    name,
    date,
    rate: WEEKLY_RATE,
    books,
  };
}

const getPublishersData = async () => {
  const publishersLists = { disp: PUBLISHERS_DISP };

  const lists = [
    [HARDCOVER_FICTION, PUBLISHERS_HARDCOVER_FICTION_URL],
    [HARDCOVER_NONFICTION, PUBLISHERS_HARDCOVER_NONFICTION_URL],
    [PAPERBACK_FICTION, PUBLISHERS_PAPERBACK_FICTION_URL],
    [MASS_MARKET, PUBLISHERS_MASS_MARKET_URL],
    [PICTURE_BOOK, PUBLISHERS_PICTURE_BOOK_URL],
  ];

  lists.forEach(async (pair) => {
    const page = await axios.get(pair[1]).then((res) => res.data);
    if (page) {
      publishersLists[pair[0]] = publishersList(page);
    }
  });

  return publishersLists;
}

const updateLists = async (lists) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("running poller!");
  }

  lists.nyt = await getNYTimesData();
  lists.indie = await getIndieBoundData();
  lists.publishers = await getPublishersData();

  if (process.env.NODE_ENV !== "production") {
    console.log("done running poller!");
  }
}

module.exports = {
  updateLists
}
