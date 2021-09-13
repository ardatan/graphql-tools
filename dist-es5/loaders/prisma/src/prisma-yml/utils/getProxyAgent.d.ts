/// <reference types="node" />
import { Agent as HttpsAgent } from 'https';
import { Agent as HttpAgent } from 'http';
export declare function getProxyAgent(url: string): HttpAgent | HttpsAgent | undefined;
