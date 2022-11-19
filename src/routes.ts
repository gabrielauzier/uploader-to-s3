const routes = require("express").Router();
const multer = require("multer");
const multerConfig = require("./config/multer");

const analyze = require("./textract/scanner");

routes.post(
  "/doc",
  multer(multerConfig).single("file"),
  async (req: any, res: any) => {
    const post = req.file;

    return res.json(post);
  }
);

routes.get("/doc/:key", async (req: any, res: any) => {
  const { key } = req.params;
  const doc_info = await analyze(key);

  return res.json(doc_info);
});

module.exports = routes;
