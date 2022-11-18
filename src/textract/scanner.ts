require("dotenv").config();

import {
  AnalyzeDocumentCommand,
  TextractClient,
  AnalyzeDocumentCommandInput,
  AnalyzeDocumentCommandOutput,
  Block,
} from "@aws-sdk/client-textract";
import { includes, values, has } from "lodash";

const textractClient = new TextractClient({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucket = process.env.AWS_BUCKET_NAME;
const key =
  "91a2487ee4b70d222e967f91c9213f50-GUIA SIMPLES NACIONAL exemplo parte inferior.png";

const params: AnalyzeDocumentCommandInput = {
  Document: {
    S3Object: {
      Bucket: bucket,
      Name: key,
    },
  },
  FeatureTypes: ["FORMS"],
};

const getKeyValueMaps = (blocks: Block[]) => {
  const keyMap = new Map<string, Block>();
  const valueMap = new Map<string, Block>();
  const blockMap = new Map<string, Block>();

  let blockId;
  blocks.forEach((block) => {
    blockId = block.Id ?? "";
    blockMap.set(blockId, block);

    if (block.BlockType === "KEY_VALUE_SET") {
      if (includes(block.EntityTypes, "KEY")) {
        keyMap.set(blockId, block);
      } else {
        valueMap.set(blockId, block);
      }
    }
  });

  return { keyMap, valueMap, blockMap };
};

type map = Map<string, Block>;

const getKeyValueRelationship = (keyMap: map, valueMap: map, blockMap: map) => {
  const keyValues = new Map<string, string>();
  const keyMapValues = values(keyMap); // array de blocks com tipo key

  keyMapValues.forEach((keyMapValue: Block) => {
    const valueBlock = findValueBlock(keyMapValue, valueMap);
    const key = getText(keyMapValue, valueMap);
    const value = getText(valueBlock, blockMap);
    keyValues.set(key, value);
  });

  return keyValues;
};

const findValueBlock = (keyBlock: Block, valueMap: map) => {
  let valueBlock: any;

  keyBlock.Relationships?.forEach((relationship) => {
    if (relationship.Type === "VALUE") {
      relationship.Ids?.every((valueId) => {
        if (has(valueMap, valueId)) {
          valueBlock = valueMap.get(valueId);
          return false;
        }
      });
    }
  });

  return valueBlock;
};

const getText = (result: Block, blocksMap: map) => {
  let text = "";

  if (has(result, "Relationships")) {
    result.Relationships?.forEach((relationship) => {
      if (relationship.Type === "CHILD") {
        relationship.Ids?.forEach((childId) => {
          const word = blocksMap.get(childId);
          if (word?.BlockType === "WORD") text += word.Text;
          if (word?.BlockType === "SELECTION_ELEMENT") {
            if (word.SelectionStatus === "SELECTED") text += "X ";
          }
        });
      }
    });
  }

  return text.trim();
};

const displayBlockInfo = async (response: AnalyzeDocumentCommandOutput) => {
  if (response.Blocks)
    try {
      response.Blocks.forEach((block: Block) => {});
    } catch (err) {
      console.log("Error trying to display block info. ", err);
    }
};

const analyze_document_text = async () => {
  try {
    const analyzeDoc = new AnalyzeDocumentCommand(params);
    const response = await textractClient.send(analyzeDoc);

    if (response.Blocks) {
      const { keyMap, valueMap, blockMap } = getKeyValueMaps(response.Blocks);
      console.log(keyMap);
      console.log(valueMap);
      console.log(blockMap);
      const document_info = getKeyValueRelationship(keyMap, valueMap, blockMap);

      console.log(JSON.stringify(document_info));
      return document_info;
    }

    // in case no blocks are found
    return undefined;
  } catch (err) {
    console.log("Error trying to analyze document. ", err);
  }
};

analyze_document_text();
