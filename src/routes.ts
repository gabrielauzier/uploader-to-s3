import express from "express";
import multer from "multer";
import { multerConfig } from "./config/multer";

const routes = express.Router();
import { analyzeDocumentText } from "./textract/analyze";
import { analyzeDocumentTextAsync } from "./textract/analyzeAsync";

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
  const doc_info = await analyzeDocumentTextAsync(key);
  return res.json(doc_info);
});

module.exports = routes;
