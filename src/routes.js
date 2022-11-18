const routes = require("express").Router();
const multer = require("multer");
const multerConfig = require("./config/multer");

routes.post(
  "/posts",
  multer(multerConfig).single("file"),
  async (req, res, next) => {
    const post = req.file;

    return res.json(post);
  }
);

module.exports = routes;
