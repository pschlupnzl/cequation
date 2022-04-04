import CEq from "./Ceq";
import { scan } from "./scan";
import { scanLatex } from "./scanLatex";
import {
  test_eval,
  test_latex_eval,
  test_parse,
  test_latex_parse,
  test_scan,
} from "./tests";
import Tree from "./Tree";

test_scan();
test_parse();
test_eval();
test_latex_parse();
test_latex_eval();

[
  // Tests.
  // "3 * -6*(5 - max(3,5,6)) + (3 + 1 + -7)/-2",
  // "3 *(3 + 1 + -7)/-2",
  // "2*3/4*(6*5)/-(7*2^-2)",
  // "24 / 3 / (2*2)",
  // "1 - 2 - 3 + 4 - 5"
  // "2^2^2 - (2 * 2) * (2 * 2)"
  // "( 1 + 2)/(3 + 4) * (5 + 6) / (7 - 8)",
  // "24 * 2 / 3",
  // "8^(1/3)"
  // "nrt(3, 8)"
  "sqrt(9)*2"
].forEach((src) => {
  const eq = CEq.parse(src, scan).printSource().printTokens().printStack();
  Tree.from(eq).print().calc().simplify().print().calc();
  console.log(` = ` + eq.calc());
});

[
  //
  // "2 \\times 3", // expect: 6
  // "1 + \\sin(2)", // expect: 1.9092974268256817
  // '2 \\sin(3)', // expect: 0.2822400161197344
  // '-2 \\times 3', // expect: -6,
  // "2\\times 3/4\\times (6\\times 5)/-(7\\times 2^-2)", // expect: -25.714285714285715
  // "\\pi", // expect: 3.141592653589793
  // "\\frac{1}{2}",
  // "\\sqrt 4"
  "\\sqrt 92"
  // "\\sqrt[3]{8}", // expect: 2 expect: ["8","1","3","/","^"]
  // "2^{1 + 3}"
  // "2_1"
  // "2^-1",
].forEach((src) => {
  const eq = CEq.parse(src, scanLatex, { implicitMultiplication: true })
    .printSource()
    .printTokens()
    .printStack();
  Tree.from(eq).print(); //.calc().simplify().print().calc();
  console.log(` = ` + eq.calc());
});
