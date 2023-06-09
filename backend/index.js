const express = require("express");
const cors = require("cors");

const dotenv = require("dotenv");
const routes = require("./routes/routes");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const { dirname, join } = require("path");

const { fileURLToPath } = require("url");

dotenv.config();

// const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 5000;

const corsOptions = { credentials: true, origin: process.env.URL || "*" };

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use("/", routes);
// app.use("/", express.static(join(__dirname, "public")));
app.listen(PORT, () => {
  console.log("port is listening of port " + PORT);
});
