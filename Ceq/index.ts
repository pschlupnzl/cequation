import { CEq } from "./Ceq";
import { test_eval, test_parse, test_scan } from "./tests";

test_scan();
test_parse();
test_eval();

[
  // Tests.
  // '2*-2'
  // "1 * sin(2)",
  "1 * -2"
  // "3 * (5 - max(3,5,6)) + (3 + 1)/-2",
// "max(1,2,3)"
  // "(3 + 1)/-2",
].forEach((str) => {
  console.log(` = ` + 
    new CEq()
      // Chain
      .parse(str)
      .printSource()
      .printTokens()
      .process()
      .printStack()
      .tree()
      .calc()
  );
});
