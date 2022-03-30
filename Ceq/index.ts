import CEq from "./Ceq";
import { scan } from "./scan";
import { scanLatex } from "./scanLatex";
import { test_eval, test_parse, test_scan } from "./tests";
import Tree from "./Tree";

test_scan();
test_parse();
test_eval();

[
  // Tests.
  // '2*-2'
  // "1 * sin(2)",
  // "1 * -2"
  // "3 * -6*(5 - max(3,5,6)) + (3 + 1 + -7)/-2",
  // "3 *(3 + 1 + -7)/-2",
  // "max(1,3,4)"
  // "2*3/4*(6*5)/-(7*2^-2)",
  // "2*3"
  // "2 * 3 * 4"
  // "24 / 3 / (2*2)",
  // "1 - 2 - 3 + 4 - 5"
  // "2^2^2 - (2 * 2) * (2 * 2)"
  // "( 1 + 2)/(3 + 4) * (5 + 6) / (7 - 8)"
  // "24 * 2 / 3",
  // "max(1,2,3)"
  // "(3 + 1)/-2",
  // "1+2"
].forEach((src) => {
  const eq = CEq.parse(src, scan).printSource().printTokens().printStack();
  Tree.from(eq).print().calc().simplify().print().calc();
  console.log(` = ` + eq.calc());
});

["1 2"].forEach((src) => {
  const eq = CEq.parse(src, scanLatex).printSource().printTokens().printStack();
  console.log(` = ` + eq.calc());
});
