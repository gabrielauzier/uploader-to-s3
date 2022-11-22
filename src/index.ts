require("dotenv").config();

import express from "express";
import morgan from "morgan";
import path from "path";

const app = express();

app.use(express.json()); //para lidar com o corpo de mensagens tipo json
app.use(express.urlencoded({ extended: true })); // como deve lidar para requisições no padrão especifico
app.use(morgan("dev"));

app.use(
  "/files",
  express.static(path.resolve(__dirname, "..", "tmp", "uploads"))
);
app.use(require("./routes"));

app.listen(3000);
