import "dotenv/config";
import {
  StartDocumentAnalysisCommand,
  StartDocumentAnalysisCommandInput,
  GetDocumentAnalysisCommand,
} from "@aws-sdk/client-textract";

import { textractClient } from "../libs/textractClient";
import { getDocInfoByBlocks } from "./utils";
import crypto from "crypto";

const analyzeDocumentTextAsync = async (key: string) => {
  // const key = "b0c812a13bb6f33d91836089de44a06e-GuiaPagamento_17905206000163_131020221344565187.pdf"

  try {
    const params: StartDocumentAnalysisCommandInput = {
      DocumentLocation: {
        S3Object: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Name: key,
        },
      },
      FeatureTypes: ["FORMS"],
      ClientRequestToken: crypto.randomBytes(8).toString("hex"),
      JobTag: "jobTag",
      NotificationChannel: {
        RoleArn: process.env.AWS_TEXTRACT_ROLE_ARN,
        SNSTopicArn: process.env.AWS_SNS_TOPIC_ARN,
      },
    };
    const startCommand = new StartDocumentAnalysisCommand(params);
    const response = await textractClient.send(startCommand);

    const getCommand = new GetDocumentAnalysisCommand({
      JobId: response.JobId,
    });
    var results = await textractClient.send(getCommand);

    var jobStatus = results.JobStatus;
    while (jobStatus === "IN_PROGRESS") {
      results = await textractClient.send(getCommand);
      jobStatus = results.JobStatus;
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("job status: ", jobStatus);
    }

    const blocks = results.Blocks;
    if (blocks) {
      const docInfo = getDocInfoByBlocks(blocks);
      console.log(docInfo);
      return docInfo;
    }

    return undefined;
  } catch (err) {
    console.log("Error trying to analyze document asynchronously. ", err);
  }
};

export { analyzeDocumentTextAsync };
