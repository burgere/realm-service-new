const express = require("express");
const app = express();
const port = process.env.PORT || 3001;
const http = require('http');

app.listen(port, () => console.log(`Realm multiplayer service listening on port ${port}!`));

