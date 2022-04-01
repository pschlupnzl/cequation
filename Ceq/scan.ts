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
 * Order in which to scan for tokens. The order only matters in those cases
 * where the tokens would look the same.
 */
const scanOrder: { [key: string]: TokenType[] } = {
  [TokenType.Blank]: [TokenType.Blank],
  [TokenType.Number]: [
    TokenType.Number,
    TokenType.BinaryOp,
    TokenType.Open,
    TokenType.Close,
    TokenType.Push,
    TokenType.ArgOp,
    TokenType.Constant,
  ],
  [TokenType.BinaryOp]: [TokenType.BinaryOp, TokenType.Push, TokenType.Close],
  [TokenType.Open]: [TokenType.Open],
};

/** Types of standard tokens. */
type TStandardTokens = "negativeOne" | "multiply";

/** Standard tokens injected during parsing. */
export const standardTokens: { [key in TStandardTokens]: IToken } = {
  negativeOne: {
    type: TokenType.Number,
    match: "-1",
    position: 0,
  },
  multiply: {
    type: TokenType.BinaryOp,
    match: "*",
    position: 0,
  },
};

/**
 * Scan within the source equation for the token type, returning the matched
 * string or NULL if no match is found.
 * @param src Source string to scan.
 * @param position Position in string where to match.
 * @param context Context to search for token to scan for.
 */
export const scan: TLexer = (
  src: string,
  position: number,
  context: TokenType
): { skip: number; tokens: IToken[] } | undefined => {
  let type: TokenType;
  let matched: RegExpMatchArray = undefined;
  for (type of scanOrder[context]) {
    matched = regex[type].exec(src.substring(position));
    if (!!matched) {
      break;
    }
  }
  // // Implicit multiplication (not really part of the spec).
  // if (!matched && context === TokenType.BinaryOp) {
  //   const implicit = scan(src, position, TokenType.Number);
  //   if (implicit) {
  //     return implicit;
  //   }
  // }
  if (!matched) {
    return;
  }
  const match = matched[1] || matched[0];
  return {
    skip: match.length,
    tokens: [
      {
        position,
        type: type,
        match,
      },
    ],
  };
};
