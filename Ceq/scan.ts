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
console.log(
  [
    {
      lookFor: TokenType.Blank,
      tests: [
        { str: "", expect: null },
        { str: " ", expect: " " },
        { str: "  ", expect: "  " },
        { str: "   ", expect: "   " },
      ],
    },
    {
      lookFor: TokenType.Number,
      tests: [
        { str: "1", expect: "1" },
        { str: "12", expect: "12" },
        { str: "2.", expect: "2." },
        { str: "2.3", expect: "2.3" },
        { str: ".3", expect: ".3" },
        { str: "0.3", expect: "0.3" },
        { str: "00000.30000", expect: "00000.30000" },
        { str: "1e10", expect: "1e10" },
        { str: "1e1.234", expect: "1e1" },
        { str: ".", expect: null },
        { str: "", expect: null },
        { str: "a", expect: null },
        { str: "-1", expect: null },
      ],
    },
  ]
    .map((suite) => {
      const passes = suite.tests.map(
        (test: { str: string; expect: string | number }) => {
          const actual = scan(test.str, 0, suite.lookFor);
          const pass = test.expect === actual;
          if (!pass) {
            console.log(
              `${pass ? "pass" : "FAIL"} ${suite.lookFor} ${test.str} "${
                actual || ""
              }"`
            );
          }
          return { pass };
        }
      );
      return passes.reduce((acc, curr) => acc + (curr.pass ? 1 : 0), 0);
    })
    .reduce((acc, curr) => acc + curr, 0) + " passed scan"
);
