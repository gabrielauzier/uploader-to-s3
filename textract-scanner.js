require("dotenv").config();

const _ = require("lodash");
const {
  TextractClient,
  AnalyzeDocumentCommand,
} = require("@aws-sdk/client-textract");

const textract = new TextractClient({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const getText = (result, blocksMap) => {
  let text = "";

  if (_.has(result, "Relationships")) {
    result.Relationships.forEach((relationship) => {
      if (relationship.Type === "CHILD") {
        relationship.Ids.forEach((childId) => {
          const word = blocksMap[childId];
          if (word.BlockType === "WORD") {
            text += `${word.Text} `;
          }
          if (word.BlockType === "SELECTION_ELEMENT") {
            if (word.SelectionStatus === "SELECTED") {
              text += `X `;
            }
          }
        });
      }
    });
  }

  return text.trim();
};

const findValueBlock = (keyBlock, valueMap) => {
  let valueBlock;
  keyBlock.Relationships.forEach((relationship) => {
    if (relationship.Type === "VALUE") {
      // eslint-disable-next-line array-callback-return
      relationship.Ids.every((valueId) => {
        if (_.has(valueMap, valueId)) {
          valueBlock = valueMap[valueId];
          return false;
        }
      });
    }
  });

  return valueBlock;
};

const getKeyValueRelationship = (keyMap, valueMap, blockMap) => {
  const keyValues = {};

  const keyMapValues = _.values(keyMap);

  keyMapValues.forEach((keyMapValue) => {
    const valueBlock = findValueBlock(keyMapValue, valueMap);
    const key = getText(keyMapValue, blockMap);
    const value = getText(valueBlock, blockMap);
    keyValues[key] = value;
  });

  return keyValues;
};

const getKeyValueMap = (blocks) => {
  const keyMap = {};
  const valueMap = {};
  const blockMap = {};

  let blockId;
  blocks.forEach((block) => {
    blockId = block.Id;
    blockMap[blockId] = block;

    if (block.BlockType === "KEY_VALUE_SET") {
      if (_.includes(block.EntityTypes, "KEY")) {
        keyMap[blockId] = block;
      } else {
        valueMap[blockId] = block;
      }
    }
  });

  return { keyMap, valueMap, blockMap };
};

const bucket = process.env.AWS_BUCKET_NAME;
const key =
  "91a2487ee4b70d222e967f91c9213f50-GUIA SIMPLES NACIONAL exemplo parte inferior.png";

// module.exports = async (buffer) => {

// };

const params = {
  Document: {
    /* required */
    S3Object: {
      Bucket: bucket,
      Name: key,
    },
  },
  FeatureTypes: ["FORMS"],
};

const analyze = async () => {
  //   const request = textract.analyzeDocument(params);
  const request = new AnalyzeDocumentCommand(params);
  const data = await textract.send(request);

  if (data && data.Blocks) {
    const { keyMap, valueMap, blockMap } = getKeyValueMap(data.Blocks);
    const keyValues = getKeyValueRelationship(keyMap, valueMap, blockMap);

    console.log(keyValues);
    return keyValues;
  }

  // in case no blocks are found return undefined
  return undefined;
};

analyze();
