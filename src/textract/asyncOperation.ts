import {
  StartDocumentTextDetectionCommand,
  StartDocumentAnalysisCommand,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "@aws-sdk/client-textract";

import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from "@aws-sdk/client-sqs";

// Get service objects
import { snsClient } from "../libs/snsClient";
import { sqsClient } from "../libs/sqsClient";
import { textractClient } from "../libs/textractClient";

// Set bucket and video variables
const bucket = process.env.AWS_BUCKET_NAME!;
const documentKey = "chave";
const roleARN = "arn:aws:iam::671918202338:role/textract-role";
const processType = "FORMS";
var startJobId = "";

const snsTopicName = "conube-topic-example";
const sqsQueueName = "conube-queue-example";

// Line below is useful when creating a snsTopic
// const snsTopicParams = {Name: snsTopicName}

type ProcessType = "DETECTION" | "ANALYSIS";

interface ProcessDocumentParams {
  type: ProcessType;
  bucket: string;
  videoName: string;
  roleArn: string;
  sqsQueueUrl: string;
  snsTopicArn: string;
}

interface GetJobResponseParams {
  sqsQueueUrl: string;
  processType: ProcessType;
}

interface GetResultsParams {
  processType: ProcessType;
  jobId: string;
}

async function getJobResponse({
  sqsQueueUrl,
  processType,
}: GetJobResponseParams) {
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: sqsQueueUrl,
      MaxNumberOfMessages: 10,
    });

    var jobFound = false;
    var succeeded = false;

    // While not found, continue to poll for response
    while (!jobFound) {
      const sqsReceivedResponse = await sqsClient.send(command);

      if (sqsReceivedResponse) {
        const responseString = JSON.stringify(sqsReceivedResponse);
        if (!responseString.includes("Body")) {
          console.log("------ dot line -------");
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }
      }

      // Once job found, log Job ID and return true if status is succeeded
      const { Messages } = sqsReceivedResponse;
      if (Messages)
        for (var message of Messages) {
          const notification = JSON.parse(message.Body ?? "");
          const rekMessage = JSON.parse(notification.Message);
          const messageJobId = rekMessage.JobId;

          if (String(rekMessage.JobId).includes(String(startJobId))) {
            console.log("Matching job found: ");
            console.log(rekMessage.JobId);
            jobFound = true;

            // Get results function here
            const operationResults = await getResults({
              processType,
              jobId: rekMessage.JobId,
            });
            console.log(
              "RESULTS THAT I WANT (RESPONSE WITH BLOCKS): ",
              operationResults
            );

            console.log(rekMessage.Status);
            if (String(rekMessage.Status).includes(String("SUCCEEDED"))) {
              succeeded = true;
              console.log("Job processing succeeded. ");
              const command = new DeleteMessageCommand({
                QueueUrl: sqsQueueUrl,
                ReceiptHandle: message.ReceiptHandle,
              });
              const sqsDeleteMessage = await sqsClient.send(command);
              console.log("Message deleted. ", sqsDeleteMessage);
            } else {
              console.log("Provided Job ID did not match returned ID.");
              const command = new DeleteMessageCommand({
                QueueUrl: sqsQueueUrl,
                ReceiptHandle: message.ReceiptHandle,
              });
              const sqsDeleteMessage = await sqsClient.send(command);
              console.log("Message deleted. ", sqsDeleteMessage);
            }
          }

          console.log("Done!");
        }
    }
  } catch (err) {
    console.log("Error trying to get response. ", err);
  }
}

async function getResults({ processType, jobId }: GetResultsParams) {
  var maxResults = 1000;
  var paginationToken = null;
  var finished = false;

  while (!finished) {
    var response = null;
  }
  // to-do
}

// Process a document based on operation type
async function processDocument({
  type,
  bucket,
  videoName: key,
  roleArn,
  sqsQueueUrl,
  snsTopicArn,
}: ProcessDocumentParams) {
  try {
    // Set job found and success status to false initially
    var dotLine = 0;
    var processType = type;
    var validType = false;

    const params: ServiceInputTypes = {
      DocumentLocation: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
      NotificationChannel: {
        RoleArn: roleArn,
        SNSTopicArn: snsTopicArn,
      },
      FeatureTypes: ["FORMS"],
    };

    if (processType === "DETECTION") {
      const command = new StartDocumentTextDetectionCommand(params);
      const response = await textractClient.send(command);
      console.log("Processing type: Detection");
      validType = true;
    }

    if (processType === "ANALYSIS") {
      const command = new StartDocumentAnalysisCommand(params);
      const response = await textractClient.send(command);
      console.log("Processing type: Analysis");
      validType = true;
    }

    if (validType === false) {
      console.log("Invalid processing type. Choose Detection or Analysis. ");
    }
  } catch (err) {
    console.log("Error trying to process document. ", err);
  }
}

export { processDocument };
