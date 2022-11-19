require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const path = require("path");

const app = express();

/** Database setup */
// const mongoose = require("mongoose");
// mongoose.connect("mongodb://localhost:27017/upload");

app.use(express.json()); //para lidar com o corpo de mensagens tipo json
app.use(express.urlencoded({ extended: true })); // como deve lidar para requisições no padrão especifico
app.use(morgan("dev"));

app.use(
  "/files",
  express.static(path.resolve(__dirname, "..", "tmp", "uploads"))
);
app.use(require("./routes"));

app.listen(3000);
