import { getEncoding } from "js-tiktoken";

export interface TokenEncoding {
  encode(text: string): unknown[];
}

export function loadEncoding(name: string): TokenEncoding {
  return getEncoding(name as Parameters<typeof getEncoding>[0]);
}

export function countTokens(text: string, encoding: TokenEncoding): number {
  try {
    return encoding.encode(text).length;
  } catch {
    return Math.floor(text.length / 4);
  }
}
