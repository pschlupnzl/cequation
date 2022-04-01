import { collectionRegex } from "./collectionRegex";
import { argops, constants, latexops } from "./constants";
import { IToken, TokenType } from "./IToken";
import { ILexerScan, TLexer } from "./TLexer";

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
    regex: collectionRegex(latexops),
    create: (match) => match.substring(1),
  },
  /** Constants, e.g. pi. */
  [TokenType.Constant]: {
    regex: collectionRegex(constants),
    create: (match) => match,
  },
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

/** Candidates available for implicit multiplication, e.g. 2 sin(x). */
const implicitMultiplication = [
  TokenType.Number,
  TokenType.Open,
  TokenType.ArgOp,
  TokenType.Constant,
];

interface IScanLatexState {
  /** Groups opened and closed by braces. */
  groups: object[];
}

/**
 * Scan within the source equation for the token type, returning the matched
 * string or NULL if no match is found.
 * @param src Source string to scan.
 * @param position Position in string where to match.
 * @param context Type of token to scan for.
 * @param state Reference to state store, used to track pending operations.
 */
export const scanLatex: TLexer = (
  src: string,
  position: number,
  context: TokenType,
  state?: IScanLatexState
): ILexerScan | undefined => {
  try {
    let type: TokenType;
    let matcher: { regex: RegExp; create: (m: string) => string };
    let matched: RegExpMatchArray;
    for (type of scanOrder[context]) {
      matcher = latexMatcher[type];
      let matched = matcher.regex.exec(src.substring(position));
      if (!!matched) {
        break;
      }
    }
    if (
      !matched &&
      type === TokenType.BinaryOp &&
      position > 0 &&
      implicitMultiplication.some((alt) => !!scanLatex(src, position, alt))
    ) {
      return {
        skip: 0,
        tokens: [
          {
            position,
            type: TokenType.BinaryOp,
            match: "*",
          },
        ],
      };
    }
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
          match: matcher.create(match),
        },
      ],
    };

    // const matcher = latexMatcher[type];
    // try {
    //   let match = matcher.regex.exec(src.substring(position));
    //   if (
    //     !match &&
    //     type === TokenType.BinaryOp &&
    //     position > 0 &&
    //     implicitMultiplication.some((alt) => !!scanLatex(src, position, alt))
    //   ) {
    //     return {
    //       position,
    //       type: TokenType.BinaryOp,
    //       length: 0,
    //       match: "*",
    //     };
    //   }

    //   return (
    //     match && {
    //       position,
    //       type: type,
    //       length: (match[1] || match[0]).length,
    //       match: matcher.create(match[1] || match[0]),
    //     }
    //   );
  } catch (err) {
    console.log(
      `scanLatex ${context} ${src.substring(0, position)} →${src.substring(
        position
      )}`
    );
    throw err;
  }
};
