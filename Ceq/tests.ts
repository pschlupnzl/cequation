import CEq from "./Ceq";
import { TokenType } from "./IToken";
import { scan } from "./scan";
import { scanLatex } from "./scanLatex";

/** Test the token scanner. */
export const test_scan = () => {
  console.log(
    [
      {
        context: TokenType.Blank,
        tests: [
          { str: "", expect: undefined },
          { str: " ", expect: " " },
          { str: "  ", expect: "  " },
          { str: "   ", expect: "   " },
        ],
      },
      {
        context: TokenType.Number,
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
          { str: ".", expect: undefined },
          { str: "", expect: undefined },
          { str: "a", expect: undefined },
          { str: "-1", expect: undefined },
        ],
      },
    ]
      .map((suite) => {
        const passes = suite.tests.map(
          (test: { str: string; expect: string | number }) => {
            const actual = scan(test.str, 0, suite.context);
            const pass = test.expect === actual?.match;
            if (!pass) {
              console.log(
                `${pass ? "pass" : "FAIL"} ${suite.context} ${test.str} "${
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
};

/** Test parsing into tokens. */
export const test_parse = () => {
  console.log(
    [
      { src: "1", expect: ["1"] },
      { src: "1+2", expect: ["1", "2", "+"] },
      { src: "1+2*3", expect: ["1", "2", "3", "*", "+"] },
      { src: "(1+2)*3", expect: ["1", "2", "+", "3", "*"] },
      { src: "1+2+3", expect: ["1", "2", "+", "3", "+"] },
      { src: "1+2-3", expect: ["1", "2", "3", "-", "+"] },
      { src: "1-2+3", expect: ["1", "2", "-", "3", "+"] },
      { src: "1+2-3+4", expect: ["1", "2", "3", "-", "+", "4", "+"] },
      { src: "1-2-3-4", expect: ["1", "2", "-", "3", "-", "4", "-"] },
      { src: "1*2*3", expect: ["1", "2", "*", "3", "*"] },
      { src: "1*2/3", expect: ["1", "2", "3", "/", "*"] },
      { src: "1/2*3", expect: ["1", "2", "/", "3", "*"] },
      { src: "3^2", expect: ["3", "2", "^"] },
      { src: "-3^2", expect: ["-1", "3", "2", "^", "*"] },
      { src: "3^-2", expect: ["3", "-1", "2", "*", "^"] },
      { src: "3^(-2)", expect: ["3", "-1", "2", "*", "^"] },
      { src: "-3^-2", expect: ["-1", "3", "-1", "2", "*", "^", "*"] },
      { src: "2*-3", expect: ["2", "-1", "*", "3", "*"] },
      {
        src: "3 * (5 - 3) + (3 + 1)/2",
        expect: ["3", "5", "3", "-", "*", "3", "1", "+", "2", "/", "+"],
      },
    ]
      .map((test) => {
        const actual = CEq.parse(test.src, scan)._stack.map((tok) => tok.match);
        const pass = test.expect.every(
          (expect, index) => expect === actual[index]
        );
        if (!pass) {
          console.log(
            `${pass ? "ok  " : "FAIL"} ${test.src} ${actual.join(", ")}`
          );
        }
        return { pass };
      })
      .reduce((acc, curr) => acc + (curr.pass ? 1 : 0), 0) + " passed parse"
  );
};

/** Test parsing and numerical evaluation. */
export const test_eval = () => {
  console.log(
    [
      { src: "1", expect: 1 },
      { src: "1 + 2 * 3", expect: 7 },
      { src: "1 + 2 - 3 + 4", expect: 4 },
      { src: "1 - 2 - 3 - 4", expect: -8 },
      { src: "1 + 2 - 3", expect: 0 },
      { src: "1 - 3 + 2", expect: 0 },
      { src: "1 / 2 * 3", expect: 1.5 },
      { src: "1 * 3 / 2", expect: 1.5 },
      { src: "1 / 2 / 2", expect: 0.25 },
      { src: "2*-2", expect: -4 },
      { src: "-2*2", expect: -4 },
      { src: "-2*-2", expect: 4 },
      { src: "2^3", expect: 8 },
      { src: "2^3^4", expect: 4096 },
      { src: "1 + +2", expect: 3 },
      { src: "1 - +2", expect: -1 },
      { src: "1 * +2", expect: 2 },
      { src: "1 * -2", expect: -2 },
      { src: "(1 + 2) * 3", expect: 9 },
      { src: "9 - 2^2", expect: 5 },
      { src: "3^2", expect: 9 },
      { src: "-3^2", expect: -9 },
      { src: "3^-2", expect: 1 / 9 },
      { src: "3^(-2)", expect: 1 / 9 },
      { src: "-3^-2", expect: -1 / 9 },
      { src: "3 * (5 - 3) + (3 + 1)/-2", expect: 4 },
      { src: "(3 + 1)/-2", expect: -2 },
      { src: "pi", expect: 3.141592653589793 },
      { src: "cos(0)", expect: 1 },
      { src: "3 * (cos(0) + sin(0))", expect: 3 },
      { src: "3 * (5 - 3) + (3 + 1)/2", expect: 8 },
      { src: "sin(pi)", expect: 0 },
      { src: "cos(3*pi/2)", expect: 0 },
      { src: "sqrt(4)", expect: 2 },
      { src: "(5 + 11) /  (4 + 2*2)", expect: 2 },
      { src: "3^(1+2)", expect: 27 },
      { src: "sind(90)", expect: 1 },
      { src: "abs(1)", expect: 1 },
      { src: "abs(-1)", expect: 1 },
      { src: "log(10)", expect: 2.302585092994046 },
      { src: "log10(10)", expect: 1 },
      { src: "!1", expect: 0 },
      { src: "!!1", expect: 1 },
      { src: "!(1 - 1)", expect: 1 },
      { src: "sgn(-.1)", expect: -1 },
      { src: "sgn(+.1)", expect: 1 },
      { src: "sgn(0)", expect: 0 },
      { src: "asin(sin(0.5))", expect: 0.5 },
      { src: "asind(sind(0.5))", expect: 0.5 },
      { src: "atan2(1,1)", expect: Math.PI / 4 },
      { src: "atan2d(1,1)", expect: 45 },
      { src: "atan2d(2,(13, 1+1))", expect: 45 },
      { src: "ceil(0.1)", expect: 1 },
      { src: "floor(0.9)", expect: 0 },
      { src: "round(0.4)", expect: 0 },
      { src: "round(0.5)", expect: 1 },
      { src: "max(3,2)", expect: 3 },
      { src: "max(2,3)", expect: 3 },
      { src: "max(3)", expect: 3 },
      { src: "max(1,3,2)", expect: 3 },
      { src: "5,max(1,3,2)", expect: 3 },
      { src: "5,max(1,3,2),-1", expect: -1 },
      { src: "max(5,0),max(0,1)", expect: 1 },
      { src: "max(3,(12, 0),-4)", expect: 3 },
      { src: "2,3", expect: 3 },
      { src: "1 + 3, 4 + 5", expect: 9 },
      { src: "1 + (3, 4) + 5", expect: 10 },
    ]
      .map((test) => {
        const actual = CEq.parse(test.src, scan).calc();
        const pass = Math.abs(test.expect - actual) < 1e-12;
        if (!pass) {
          console.log(`${pass ? "ok  " : "FAIL"} ${test.src} ${actual}`);
        }
        return { pass };
      })
      .reduce((acc, curr) => acc + (curr.pass ? 1 : 0), 0) + " passed eval"
  );
};

/** Test the LaTeX parsing. */
export const test_parse_latex = () => {
  console.log(
    [
      { src: "1 * 2", expect: ["1", "2", "*"] },
      { src: "1 2", expect: ["1", "2", "*"] },
      // {src: "sin(3)", expect: ["3", "sin"]},
      // {src: "2 sin(3)", expect: ["2", "3", "sin", "*"]},
    ]
      .map((test) => {
        const actual = CEq.parse(test.src, scanLatex)._stack.map(
          (tok) => tok.match
        );
        const pass = test.expect.every(
          (expect, index) => expect === actual[index]
        );
        if (!pass) {
          console.log(
            `${pass ? "ok  " : "FAIL"} ${test.src} ${actual.join(", ")}`
          );
        }
        return { pass };
      })
      .reduce((acc, curr) => acc + (curr.pass ? 1 : 0), 0) + " passed parse"
  );
};
