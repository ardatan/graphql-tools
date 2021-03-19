import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { PrismaDefinition } from './prisma-json-schema';
import { Variables } from './Variables';
import { Args } from './types/common';
import { Output, IOutput } from './Output';

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
