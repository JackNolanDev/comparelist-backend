const express = require('express');

const isProd = process.env.NODE_ENV === "production";

// INIT EXPRESS
const app = express();

// CORS policy
const origin = isProd ? process.env.WEBSITE_URL : "http://localhost:8080";
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

// BODY PARSER
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/ping', (req, res) => {
    res.send('pong');
});

app.listen(process.env.PORT || 5000);
