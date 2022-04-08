import { collectionRegex } from "./collectionRegex";
import { IToken, TokenType } from "./IToken";
import { ILexerScan, TLexer, TScanState } from "./TLexer";

interface ILatexMatcher {
  regex: RegExp;
  create?: (m: string) => string;
}

/** LaTeX functions and their equivalents. */
const latexops = {
  "\\times": "*",
  "\\sin": "sin",
  "\\cos": "cos",
  "\\tan": "tan",
};

const latexconstants = {
  "\\pi": "pi",
};

const latex = { ...latexops, ...latexconstants };

const latexMatcher: { [key in TokenType]: ILatexMatcher } = {
  /** Blank. */
  [TokenType.Blank]: { regex: /^\s+/ },
  /** Number e.g. 1.234e12 (excludes negative sign). */
  [TokenType.Number]: {
    regex: /^(?:[0-9]+(?:\.[0-9]*)?|0?\.[0-9]+)(?:e[0-9]+)?/,
    create: (match) => match,
  },
  /** Binary operator. */
  [TokenType.BinaryOp]: { regex: /^(?:\+|\-|\\times|\/|\^|_)/ },
  /** Open bracket. */
  [TokenType.Open]: { regex: /^\(/ },
  /** Open bracket. */
  [TokenType.Close]: { regex: /^\)/ },
  /** Push, i.e. comma. */
  [TokenType.Push]: { regex: /^,/ },
  /** Function, e.g. sin, cos, ... */
  [TokenType.ArgOp]: {
    regex: collectionRegex(latexops),
    create: (match) => latexops[match],
  },
  /** Constants, e.g. pi. */
  [TokenType.Constant]: {
    regex: collectionRegex(latexconstants),
    create: (match) => latexconstants[match],
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

interface IScanLatexState extends TScanState {
  /** Groups opened and closed by braces. */
  groups: string[];
}

/** Shorthand to create a token. */
const token = (match: string, position: number, type?: TokenType): IToken => {
  return {
    position,
    match,
    type:
      type ||
      {
        "(": TokenType.Open,
        ")": TokenType.Close,
        "/": TokenType.BinaryOp,
        sqrt: TokenType.ArgOp,
      }[match],
  };
};

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
  state: IScanLatexState
): ILexerScan | undefined => {
  try {
    let type: TokenType;
    let matcher: ILatexMatcher;
    let matched: RegExpMatchArray;
    state.groups = state.groups || [];
    for (type of scanOrder[context]) {
      matcher = latexMatcher[type];
      matched = matcher.regex.exec(src.substring(position));
      if (!!matched) {
        break;
      }
    }

    if (!matched && context !== TokenType.Blank) {
      return (
        scanCommand(src, position, context, state) ||
        scanGroups(src, position, context, state) ||
        scanImplicitMultiplication(src, position, context, state)
      );
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
          match: matcher.create ? matcher.create(match) : latex[match] || match,
        },
      ],
    };
  } catch (err) {
    console.log(
      `ERROR scanLatex ${context} ${src.substring(
        0,
        position
      )} →${src.substring(position)}`
    );
    throw err;
  }
};

/** Scan for implicit multiplication. */
const scanImplicitMultiplication = (
  src: string,
  position: number,
  context: TokenType,
  state: IScanLatexState
): ILexerScan | undefined => {
  if (
    context === TokenType.BinaryOp &&
    position > 0 &&
    implicitMultiplication.some((alt) => !!scanLatex(src, position, alt, state))
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
};

/**
 * Scan for groups { .. } (*not* brace literals \{ .. \}!)
 */
const scanGroups = (
  src: string,
  position: number,
  context: TokenType,
  state: IScanLatexState
): ILexerScan | undefined => {
  const ssrc = src.substring(position);
  if (ssrc.startsWith("{")) {
    state.groups.push("(");
    return {
      skip: 1,
      tokens: [token("(", position)],
    };
  } else if (ssrc.startsWith("}")) {
    switch (state.groups.pop()) {
      case "\\frac":
        state.groups.push("(");
        return {
          skip: 1,
          tokens: [
            token(")", position),
            token("/", position),
          ],
        };
      case "(":
        return { skip: 1, tokens: [token(")", position)] };
    }
    return;
  } else if (ssrc.startsWith("]")) {
    switch (state.groups.pop()) {
      case "\\sqrt[":
        return {
          skip: 1,
          tokens: [token(",", position, TokenType.Push)],
        };
    }
  }
};

/**
 * Scan for commands such as \frac{..}{..}.
 */
const scanCommand = (
  src: string,
  position: number,
  context: TokenType,
  state: IScanLatexState
): ILexerScan | undefined => {
  if (context === TokenType.Number) {
    let matched: RegExpMatchArray;

    const ssrc = src.substring(position);
    if ((matched = /^\\frac\s*\{/.exec(ssrc))) {
      state.groups.push("\\frac");
      return {
        skip: "\\frac{".length,
        tokens: [token("(", position)],
      };
    } else if ((matched = /^\\sqrt\{/.exec(ssrc))) {
      state.groups.push("(");
      return {
        skip: matched[0].length,
        tokens: [token("sqrt", position), token("(", position)],
      };
    } else if ((matched = /^(\\sqrt)(\s+)(\d)/.exec(ssrc))) {
      const len: number[] = matched.map((m) => m.length);
      return {
        skip: matched[0].length,
        tokens: [
          token("sqrt", position),
          token("(", position + len[1]),
          token(matched[3], position + len[1] + len[2], TokenType.Number),
          token(")", position + len[1] + len[2] + len[3]),
        ],
      };
    } else if ((matched = /^\\sqrt\s*\[/.exec(ssrc))) {
      state.groups.push("\\sqrt[");
      return {
        skip: matched[0].length,
        tokens: [token("nrt", position, TokenType.ArgOp), token("(", position)],
      };
    }
  }
};
