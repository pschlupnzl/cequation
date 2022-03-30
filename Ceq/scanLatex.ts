import { IToken, TokenType } from "./IToken";
import { TLexer } from "./TLexer";

const latexMatcher: {
  [key in TokenType]: { regex: RegExp; create: (match: string) => string };
} = {
  /** Blank. */
  [TokenType.Blank]: { regex: /^\s+/, create: (match) => match },
  /** Number e.g. 1.234e12 (excludes negative sign). */
  [TokenType.Number]: {
    regex: /^(?:[0-9]+(?:\.[0-9]*)?|0?\.[0-9]+)(?:e[0-9]+)?/,
    create: (match) => match,
  },
  /** Binary operator. */
  [TokenType.BinaryOp]: {
    regex: /^(?:\+|\-|\*|\/|\^)/,
    create: (match) => match,
  },
  /** Open bracket. */
  [TokenType.Open]: { regex: /^\(/, create: (match) => match },
  /** Open bracket. */
  [TokenType.Close]: { regex: /^\)/, create: (match) => match },
  /** Push, i.e. comma. */
  [TokenType.Push]: { regex: /^,/, create: (match) => match },
  /** Function, e.g. sin, cos, ... */
  [TokenType.ArgOp]: null, // {regex: collectionRegex(argops),create: (match) => match},
  /** Constants, e.g. pi. */
  [TokenType.Constant]: null, // {regex: collectionRegex(constants),create: (match) => match},
};

/**
 * Scan within the source equation for the token type, returning the matched
 * string or NULL if no match is found.
 * @param src Source string to scan.
 * @param position Position in string where to match.
 * @param type Type of token to scan for.
 */
export const scanLatex: TLexer = (
  src: string,
  position: number,
  type: TokenType
): IToken | null => {
  const matcher = latexMatcher[type];
  let match = matcher.regex.exec(src.substring(position));
  if (!match && type === TokenType.BinaryOp) {
    // match = latexMatcher
  }
  return (
    match && {
      position,
      type: type,
      length: 1,
      match: matcher.create(match[1] || match[0]),
    }
  );
};
