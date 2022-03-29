import { CEq } from "./Ceq";
import { TokenType } from "./IToken";
import { scan } from "./scan";

/** Test the token scanner. */
export const test_scan = () => {
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
        const actual = CEq.parse(test.src)._stack.map((tok) => tok.match);
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
      { str: "1", expect: 1 },
      { str: "1 + 2 * 3", expect: 7 },
      { str: "1 + 2 - 3 + 4", expect: 4 },
      { str: "1 - 2 - 3 - 4", expect: -8 },
      { str: "1 + 2 - 3", expect: 0 },
      { str: "1 - 3 + 2", expect: 0 },
      { str: "1 / 2 * 3", expect: 1.5 },
      { str: "1 * 3 / 2", expect: 1.5 },
      { str: "1 / 2 / 2", expect: 0.25 },
      { str: "2*-2", expect: -4 },
      { str: "-2*2", expect: -4 },
      { str: "-2*-2", expect: 4 },
      { str: "2^3", expect: 8 },
      { str: "2^3^4", expect: 4096 },
      { str: "1 + +2", expect: 3 },
      { str: "1 - +2", expect: -1 },
      { str: "1 * +2", expect: 2 },
      { str: "1 * -2", expect: -2 },
      { str: "(1 + 2) * 3", expect: 9 },
      { str: "9 - 2^2", expect: 5 },
      { str: "3^2", expect: 9 },
      { str: "-3^2", expect: -9 },
      { str: "3^-2", expect: 1 / 9 },
      { str: "3^(-2)", expect: 1 / 9 },
      { str: "-3^-2", expect: -1 / 9 },
      { str: "3 * (5 - 3) + (3 + 1)/-2", expect: 4 },
      { str: "(3 + 1)/-2", expect: -2 },
      { str: "pi", expect: 3.141592653589793 },
      { str: "cos(0)", expect: 1 },
      { str: "3 * (cos(0) + sin(0))", expect: 3 },
      { str: "3 * (5 - 3) + (3 + 1)/2", expect: 8 },
      { str: "sin(pi)", expect: 0 },
      { str: "cos(3*pi/2)", expect: 0 },
      { str: "sqrt(4)", expect: 2 },
      { str: "(5 + 11) /  (4 + 2*2)", expect: 2 },
      { str: "3^(1+2)", expect: 27 },
      { str: "sind(90)", expect: 1 },
      { str: "abs(1)", expect: 1 },
      { str: "abs(-1)", expect: 1 },
      { str: "log(10)", expect: 2.302585092994046 },
      { str: "log10(10)", expect: 1 },
      { str: "!1", expect: 0 },
      { str: "!!1", expect: 1 },
      { str: "!(1 - 1)", expect: 1 },
      { str: "sgn(-.1)", expect: -1 },
      { str: "sgn(+.1)", expect: 1 },
      { str: "sgn(0)", expect: 0 },
      { str: "asin(sin(0.5))", expect: 0.5 },
      { str: "asind(sind(0.5))", expect: 0.5 },
      { str: "atan2(1,1)", expect: Math.PI / 4 },
      { str: "atan2d(1,1)", expect: 45 },
      { str: "atan2d(2,(13, 1+1))", expect: 45 },
      { str: "ceil(0.1)", expect: 1 },
      { str: "floor(0.9)", expect: 0 },
      { str: "round(0.4)", expect: 0 },
      { str: "round(0.5)", expect: 1 },
      { str: "max(3,2)", expect: 3 },
      { str: "max(2,3)", expect: 3 },
      { str: "max(3)", expect: 3 },
      { str: "max(1,3,2)", expect: 3 },
      { str: "5,max(1,3,2)", expect: 3 },
      { str: "5,max(1,3,2),-1", expect: -1 },
      { str: "max(5,0),max(0,1)", expect: 1 },
      { str: "max(3,(12, 0),-4)", expect: 3 },
      { str: "2,3", expect: 3 },
      { str: "1 + 3, 4 + 5", expect: 9 },
      { str: "1 + (3, 4) + 5", expect: 10 },
    ]
      .map((test) => {
        const actual = CEq.parse(test.str).calc();
        const pass = Math.abs(test.expect - actual) < 1e-12;
        if (!pass) {
          console.log(`${pass ? "ok  " : "FAIL"} ${test.str} ${actual}`);
        }
        return { pass };
      })
      .reduce((acc, curr) => acc + (curr.pass ? 1 : 0), 0) + " passed eval"
  );
};
