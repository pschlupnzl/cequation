import { collectionRegex } from "./collectionRegex";
import { argops, constants } from "./constants";
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
  [TokenType.ArgOp]: {
    regex: collectionRegex(argops),
    create: (match) => match,
  },
  /** Constants, e.g. pi. */
  [TokenType.Constant]: {
    regex: collectionRegex(constants),
    create: (match) => match,
  },
};

/** Candidates available for implicit multiplication, e.g. 2 sin(x). */
const implicitMultiplication = [
  TokenType.Number,
  TokenType.Open,
  TokenType.ArgOp,
  TokenType.Constant,
];

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
  try {
    let match = matcher.regex.exec(src.substring(position));
    if (!match) {
      if (
        type === TokenType.BinaryOp &&
        implicitMultiplication.some((alt) => !!scanLatex(src, position, alt))
      ) {
        return {
          position,
          type: TokenType.BinaryOp,
          length: 0,
          match: "*",
        };
      }
    }

    return (
      match && {
        position,
        type: type,
        length: (match[1] || match[0]).length,
        match: matcher.create(match[1] || match[0]),
      }
    );
  } catch (err) {
    console.log(
      `scanLatex ${type} ${src.substring(0, position)} →${src.substring(
        position
      )}`,
      matcher
    );
    throw err;
  }
};
