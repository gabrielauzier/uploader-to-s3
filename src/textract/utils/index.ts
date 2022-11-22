import { Block } from "@aws-sdk/client-textract";
import { has, includes } from "lodash";

const mapToObj = (inputMap: Map<any, any>) => {
  let obj: any = {};
  inputMap.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
};

const getDocInfoByBlocks = (blocks: Block[]) => {
  const { keyMap, valueMap, blockMap } = getKeyValueMaps(blocks);
  const docInfo = getKeyValueRelationship(keyMap, valueMap, blockMap);
  return mapToObj(docInfo);
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
          if (word?.BlockType === "WORD") text += word.Text + " ";
          if (word?.BlockType === "SELECTION_ELEMENT") {
            if (word.SelectionStatus === "SELECTED") text += "X ";
          }
        });
      }
    });
  }

  return text.trim().replace(":", "");
};

export { getDocInfoByBlocks };
