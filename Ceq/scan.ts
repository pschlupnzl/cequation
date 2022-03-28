import { TokenType } from "./IToken";
import { constants, argops } from "./constants";
import { TExecCollection } from "./IExec";

/** Generate a regular expression from the collection keys. */
const collectionRegex = (collection: TExecCollection | object): RegExp => {
  const keys = Object.keys(collection)
    .sort((a, b) =>
      a.length === b.length ? a.localeCompare(b) : b.length - a.length
    )
    .map((key) => key.replace(/[!]/g, (m) => `\\${m}`));
  return new RegExp(`^(${keys.join("|")})(?:[^A-Za-z]|$)`);
};

const regex: { [key: string]: RegExp } = {
  /** Blank. */
  [TokenType.Blank]: /^\s+/,
  /** Number e.g. 1.234e12 (excludes negative sign). */
  [TokenType.Number]: /^(?:[0-9]+(?:\.[0-9]*)?|0?\.[0-9]+)(?:e[0-9]+)?/,
  /** Binary operator. */
  [TokenType.BinaryOp]: /^(?:\+|\-|\*|\/|\^)/,
  /** Open bracket. */
  [TokenType.Open]: /^\(/,
  /** Open bracket. */
  [TokenType.Close]: /^\)/,
  /** Push, i.e. comma. */
  [TokenType.Push]: /^,/,
  /** Function, e.g. sin, cos, ... */
  [TokenType.ArgOp]: collectionRegex(argops),
  /** Constants, e.g. pi. */
  [TokenType.Constant]: collectionRegex(constants),
};

/**
 * Scan within the source equation for the token type, returning the matched
 * string or NULL if no match is found.
 * @param str Source string to scan.
 * @param start Position in string where to match.
 * @param lookFor Type of token to scan for.
 */
export const scan = (
  str: string,
  start: number,
  lookFor: TokenType
): string | null => {
  const match = regex[lookFor].exec(str.substring(start));
  return match && (match[1] || match[0]);
};
