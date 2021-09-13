import { PrismaDefinition } from './prisma-json-schema';
import { Args } from './types/common';
import { IOutput } from './Output';
export declare function readDefinition(
  filePath: string,
  args: Args,
  out?: IOutput,
  envVars?: any,
  _graceful?: boolean
): Promise<{
  definition: PrismaDefinition;
  rawJson: any;
}>;
