import { constants, argops } from "./constants";
import { IExec, TExecCollection } from "./IExec";
import { IToken, TokenType } from "./IToken";
import { flush, opArgs } from "./precedence";
import { scan } from "./scan";

/**
 * Class to process equations.
 */
class CEq {
  /**
   * Order in which to scan for tokens. The order only matters in those cases
   * where the tokens would look the same.
   */
  private static scanOrder = [
    TokenType.Blank,
    TokenType.Number,
    TokenType.BinaryOp,
    TokenType.Open,
    TokenType.Close,
    TokenType.Push,
    TokenType.ArgOp,
    TokenType.Constant,
  ];

  /** Executor functions. */
  private static exec: TExecCollection = {
    ...argops,
    "+": { narg: 2, f: (a: number, b: number): number => a + b },
    "-": { narg: 2, f: (a: number, b: number): number => a - b },
    "*": { narg: 2, f: (a: number, b: number): number => a * b },
    "/": { narg: 2, f: (a: number, b: number): number => a / b },
    "^": { narg: 2, f: (a: number, b: number): number => Math.pow(a, b) },
  };

  /** Negation: -2^2 = -4 (see Matlab), so handle negative as (-1)×. */
  private static negate: { [key: string]: IToken } = {
    value: {
      type: TokenType.Number,
      match: "-1",
      value: -1,
      position: 0,
    },
    op: {
      type: TokenType.BinaryOp,
      match: "*",
      position: 0,
    },
  };

  /** Source string. */
  private src: string = "";
  /** Parsed tokens. */
  public _tokens: IToken[] = [];
  /** RPN stack. */
  public _stack: IToken[] = [];

  private print(tokens: IToken[]): CEq {
    console.log(
      tokens
        .map(
          (token) =>
            `${token.match}${
              token.bracket || token.narg ? `•${token.bracket}` : ""
            }${token.narg ? `‡${token.narg}` : ""}`
        )
        .join(" · ")
    );
    return this;
  }

  public printSource(): CEq {
    console.log(`«${this.src}»`);
    return this;
  }

  public printTokens(): CEq {
    return this.print(this._tokens);
  }

  public printStack(): CEq {
    return this.print(this._stack);
  }

  /** Parse a string of the form 1 + 2 * sin(pi / 4). */
  public parse(str: string): CEq {
    this.src = str;
    this._tokens = [];
    let position: number;
    try {
      let match: string;
      for (position = 0; position < str.length; position += match.length) {
        match = null;
        const type = CEq.scanOrder.find((type) => {
          match = scan(str, position, type);
          return match && match.length;
        });
        if (!match) {
          throw new Error("Unknown expression");
        } else if (type === TokenType.Blank) {
          // NOP - ignore blanks.
        } else {
          const token: IToken = {
            position,
            type,
            match,
          };
          if (type === TokenType.Number) {
            token.value = +match;
          } else if (type === TokenType.Constant) {
            token.value = constants[match];
          }
          this._tokens.push(token);
        }
      }
    } catch (err) {
      console.error(
        `${err} ${str.substring(0, position)} →${str.substring(position)}`
      );
    }

    return this;
  }

  /**
   * Process the chain of tokens from the parse method to assemble the RPN stack.
   */
  public process(): CEq {
    /** Input tokens. */
    const tokens: IToken[] = this._tokens;
    /** Assembling RPN stack. */
    const stack: IToken[] = [];
    /** Holding pen for operators being assembled. */
    const ops: IToken[] = [];
    /** Track bracket levels as offset value. */
    let bracket = 0;
    /** Hold process position for error handling. */
    let position: number;
    try {
      let lookFor: TokenType = TokenType.Number;
      for (let k = 0; k < tokens.length; k += 1) {
        const token = tokens[k];
        position = token.position;
        switch (lookFor) {
          case TokenType.Number:
            switch (token.type) {
              case TokenType.Number:
              case TokenType.Constant:
                stack.push({ ...token, bracket });
                lookFor = TokenType.BinaryOp;
                break;
              case TokenType.Open:
                bracket += 1;
                break;
              case TokenType.ArgOp:
                ops.push({ ...token, bracket });
                if (token.match !== "!") {
                  // NOT operator doesn't take brackets.
                  lookFor = TokenType.Open;
                }
                break;
              case TokenType.BinaryOp:
                if (token.match === "-") {
                  // Handle special-case "-" as negation.
                  // Following exponent, boost priority: 3^-2 = 3^(-2).
                  const boost =
                    ops[ops.length - 1]?.match === "^" ? bracket + 1 : bracket;
                  stack.push({
                    ...CEq.negate.value,
                    position,
                    bracket: boost,
                  });
                  flush({ ...CEq.negate.op, position }, stack, ops, boost);
                } else if (token.match === "+") {
                  // Positive unary; noop.
                } else {
                  throw new Error(`Unexpected ${token.type} ${token.match}`);
                }
                break;
              default:
                throw new Error(
                  `Expected number, got ${token.type} ${token.match}`
                );
            }
            break;

          case TokenType.BinaryOp:
            switch (token.type) {
              case TokenType.BinaryOp:
                flush(token, stack, ops, bracket);
                lookFor = TokenType.Number;
                break;
              case TokenType.Push:
                flush(token, stack, ops, bracket);
                lookFor = TokenType.Number;
                break;
              case TokenType.Close:
                bracket -= 1;
                break;
              default:
                throw new Error("Expected binary op");
            }
            break;

          case TokenType.Open:
            switch (token.type) {
              case TokenType.Open:
                bracket += 1;
                lookFor = TokenType.Number;
                break;
              default:
                throw new Error("Expected -(-");
            }
            break;
          default:
            throw new Error(`not yet implemented: ${lookFor}`);
        }
      }
    } catch (err) {
      console.error(
        `${err} ${this.src.substring(0, position)} →${this.src.substring(
          position
        )}`
      );
    }
    flush(null, stack, ops, bracket);
    opArgs(stack);
    this._stack = stack;
    return this;
  }

  /**
   * Evaluate the RPN stack to calculate the result.
   */
  public eval(): number {
    let stack = [...this._stack];
    let exec: IExec;
    let narg: number;
    let args: number[];
    for (let position = 0; position < stack.length; position += 1) {
      let val: number, op: string;
      const token = stack[position];
      switch (token.type) {
        case TokenType.BinaryOp:
        case TokenType.ArgOp:
          exec = CEq.exec[token.match];
          narg = token.narg || exec.narg;
          position -= narg;
          args = stack.splice(position, narg).map((t) => t.value);
          op = stack.splice(position, 1)[0].match;
          val = exec.f(...args);
          stack.splice(position, 0, {
            position: token.position,
            type: TokenType.Number,
            match: "",
            value: val,
          });
          break;

        case TokenType.Push:
          stack.splice(position, 1); // Remove push operation
          position -= 2;
          stack.splice(position, 1); // Remove popped value.
          break;
      }
    }
    if (stack.length > 1) {
      console.warn("stack left over", stack);
    }
    return stack[0].value;
  }
}
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
    {
      src: "3 * (5 - 3) + (3 + 1)/2",
      expect: ["3", "5", "3", "-", "*", "3", "1", "+", "2", "/", "+"],
    },
  ]
    // .slice(0, 0)
    .map((test) => {
      const actual = new CEq()
        .parse(test.src)
        .process()
        ._stack.map((tok) => tok.match);
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
    { str: "!(1 - 1)", expect: 1},
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
    // .slice(0, 0) // Include this line to suppress the tests
    .map((test) => {
      const actual = new CEq().parse(test.str).process().eval();
      const pass = Math.abs(test.expect - actual) < 1e-12;
      if (!pass) {
        console.log(`${pass ? "ok  " : "FAIL"} ${test.str} ${actual}`);
      }
      return { pass };
    })
    .reduce((acc, curr) => acc + (curr.pass ? 1 : 0), 0) + " passed eval"
);

[
  // Tests.
  // "abs(-2^2,3)",
  // "1,2",
  // "abs(5, 8)",
  // "0, 1 + max(2, min(3, 4), 5^6)",
  // "atan2d(2,(13, 1+1))"
  "max(3,(12, 0),4)",
  //   "max(2,4), max(1,0,0)",
  // "2 * (cos(0) + sin(0))"
  // "3 * (5 - 3) + (3 + 1)/2",
].forEach((str) => {
  console.log(
    new CEq()
      // Chain
      .parse(str)
      .printSource()
      .printTokens()
      .process()
      .printStack()
      .eval()
  );
});
