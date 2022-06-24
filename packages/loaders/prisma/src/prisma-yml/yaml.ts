import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { PrismaDefinition } from './prisma-json-schema.js';
import { Variables } from './Variables.js';
import { Args } from './types/common.js';
import { Output, IOutput } from './Output.js';

const cache = {};

export async function readDefinition(
  filePath: string,
  args: Args,
  out: IOutput = new Output(),
  envVars?: any,
  _graceful?: boolean
): Promise<{ definition: PrismaDefinition; rawJson: any }> {
  try {
    fs.accessSync(filePath);
  } catch {
    throw new Error(`${filePath} could not be found.`);
  }
  const file = fs.readFileSync(filePath, 'utf-8');
  const json = yaml.load(file) as PrismaDefinition;
  // we need this copy because populateJson runs inplace
  const jsonCopy = { ...json };

  const vars = new Variables(filePath, args, out, envVars);
  const populatedJson = await vars.populateJson(json);
  if (populatedJson.custom) {
    delete populatedJson.custom;
  }

  cache[file] = populatedJson;
  return {
    definition: populatedJson,
    rawJson: jsonCopy,
  };
}
