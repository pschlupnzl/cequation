import { collectionRegex } from "./collectionRegex";
import { argops, constants } from "./constants";
import { IToken, TokenType } from "./IToken";
import { TLexer } from "./TLexer";

const regex: { [key in TokenType]: RegExp } = {
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
 * @param src Source string to scan.
 * @param position Position in string where to match.
 * @param type Type of token to scan for.
 */
export const scan: TLexer = (
  src: string,
  position: number,
  type: TokenType
): IToken | null => {
  const match = regex[type].exec(src.substring(position));
  return (
    match && {
      position,
      type: type,
      match: match[1] || match[0],
      length: (match[1] || match[0]).length,
    }
  );
};
