import {
  AnalyzeDocumentCommand,
  AnalyzeDocumentCommandInput,
} from "@aws-sdk/client-textract";

import { textractClient } from "../libs/textractClient";
import { getDocInfoByBlocks } from "./utils";

const analyzeDocumentText = async (key: string) => {
  const bucket = process.env.AWS_BUCKET_NAME;

  const params: AnalyzeDocumentCommandInput = {
    Document: {
      S3Object: {
        Bucket: bucket,
        Name: key,
      },
    },
    FeatureTypes: ["FORMS"],
  };

  try {
    const analyzeDoc = new AnalyzeDocumentCommand(params);
    const response = await textractClient.send(analyzeDoc);

    if (response.Blocks) {
      const docInfo = getDocInfoByBlocks(response.Blocks);
      console.log(docInfo);
      return docInfo;
    }

    return undefined;
  } catch (err) {
    console.log("Error trying to analyze document. ", err);
  }
};

export { analyzeDocumentText };
