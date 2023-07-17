import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { IOutput, Output } from './Output.js';
import { PrismaDefinition } from './prisma-json-schema.js';
import { Args } from './types/common.js';
import { Variables } from './Variables.js';

const cache: Record<string, any> = {};

export async function readDefinition(
  filePath: string,
  args: Args,
  out: IOutput = new Output(),
  envVars?: any,
  _graceful?: boolean,
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
