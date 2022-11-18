require("dotenv").config();

import {
  AnalyzeDocumentCommand,
  TextractClient,
  AnalyzeDocumentCommandInput,
  AnalyzeDocumentCommandOutput,
  Block,
} from "@aws-sdk/client-textract";
import { includes, has } from "lodash";

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

type idBlockMap = Map<string, Block>;

const getKeyValueRelationship = (
  keyMap: idBlockMap,
  valueMap: idBlockMap,
  blockMap: idBlockMap
): Map<string, string> => {
  const keyValuesMap = new Map<string, string>();

  keyMap.forEach((block, id) => {
    const key = getText(block, blockMap);

    const valueBlock = findValueBlock(block, valueMap);
    const value = getText(valueBlock as unknown as Block, blockMap);

    keyValuesMap.set(key, value);
  });

  return keyValuesMap;
};

const findValueBlock = (keyBlock: Block, valueMap: idBlockMap) => {
  let valueBlock;
  const valueMapObject = Object.fromEntries(valueMap);

  keyBlock.Relationships?.forEach((relationship) => {
    if (relationship.Type === "VALUE") {
      relationship.Ids?.every((valueId) => {
        if (has(valueMapObject, valueId)) {
          valueBlock = valueMap.get(valueId);
          return false;
        }
      });
    }
  });

  return valueBlock;
};

const getText = (result: Block, blocksMap: idBlockMap) => {
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

const analyze_document_text = async () => {
  try {
    const analyzeDoc = new AnalyzeDocumentCommand(params);
    const response = await textractClient.send(analyzeDoc);

    if (response.Blocks) {
      const { keyMap, valueMap, blockMap } = getKeyValueMaps(response.Blocks);
      const document_info = getKeyValueRelationship(keyMap, valueMap, blockMap);

      console.log(document_info);
      return Object.fromEntries(document_info);
    }

    // in case no blocks are found
    return undefined;
  } catch (err) {
    console.log("Error trying to analyze document. ", err);
  }
};

analyze_document_text();
