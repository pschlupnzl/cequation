import { constants, execs } from "./constants";
import { IExec } from "./IExec";
import { INodeToken, IToken, IValueToken, TokenType } from "./IToken";
import { flush, opArgs } from "./precedence";
import { scan } from "./scan";

/**
 * Class to process equations.
 */
export class CEq {
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

  /** Negation: -2^2 = -4 (see Matlab), so handle negative as (-1)×. */
  private static negate: { [key: string]: IToken } = {
    value: {
      type: TokenType.Number,
      match: "-1",
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
    const sup = (s: number) =>
      `${s}`.split("").map((ch) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+ch] || ch);

    console.log(
      tokens
        .map(
          (token) =>
            `${token.match}${
              token.bracket || token.narg ? `${sup(token.bracket)}` : ""
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
                  const boost = "/^".includes(ops[ops.length - 1]?.match)
                    ? bracket + 1
                    : bracket;
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
   * Experimenting with expression as tree.
   */
  public tree(): CEq {
    const origin = this.reduce<INodeToken>(
      (token: IToken) => ({ ...token, parent: undefined, children: undefined }),
      (opToken: INodeToken, argTokens: INodeToken[]): INodeToken => {
        argTokens.forEach((t) => (t.parent = opToken));
        return { ...opToken, children: [...argTokens] };
      }
    );

    const getBounds = (
      origin: INodeToken
    ): { maxcol: number; maxdepth: number; maxlen: number } => {
      let col = 0;
      let maxcol = 0;
      let maxdepth = 0;
      let maxlen = 0;
      const recursive = (node: INodeToken, depth: number = 0) => {
        node["depth"] = depth;
        node["ticks"] = [];
        node["label"] = [TokenType.Number, TokenType.Constant].includes(
          node.type
        )
          ? `${node.match}`
          : `(${node.match})`;
        maxcol = col > maxcol ? col : maxcol;
        maxdepth = depth > maxdepth ? depth : maxdepth;
        maxlen = node["label"].length > maxlen ? node["label"].length : maxlen;

        if (node.children) {
          node.children?.forEach((child) => {
            node["ticks"].push(col);
            recursive(child, depth + 1);
            col += 1;
          });
          col -= 1;
        } else {
          node["ticks"].push(col);
        }
      };
      recursive(origin, 0);
      return { maxcol, maxdepth, maxlen };
    };

    const show = (origin: INodeToken) => {
      const bounds = getBounds(origin);
      const w = bounds.maxlen + 1;
      const rows = new Array(2 * bounds.maxdepth + 1)
        .join(".")
        .split(".")
        .map((_) => new Array(w * bounds.maxcol + 3).join(" "));

      const insert = (
        depth: number,
        col: number,
        ins: string | number,
        rowshift = 0
      ): void => {
        const r = 2 * depth + rowshift;
        let c = w * col;
        if (typeof ins === "number") {
          ins = `|${new Array(w * ins).join("-")}+`;
        }
        if (ins[0] !== "(") {
          c += 1;
        }
        rows[r] = `${rows[r].substring(0, c)}${ins}${rows[r].substring(
          c + ins.length
        )}`;
      };

      const recursive = (node: INodeToken) => {
        const depth = node["depth"];
        const col = node["ticks"][0];
        const label = node["label"];
        insert(depth, col, label);
        if (node.children) {
          insert(depth, col, "|", 1);
          node["ticks"]
            .slice(0, node["ticks"].length - 1)
            .forEach((tick: number, index: number) =>
              insert(depth, tick, node["ticks"][index + 1] - tick, 1)
            );
          node.children?.forEach((child) => recursive(child));
        }
      };
      recursive(origin);
      rows.forEach((row) => console.log(row));
    };

    show(origin);
    return this;
  }

  public reduce<T extends IToken>(
    mapper: (token: IToken) => T,
    reducer: (opToken: T, argTokens: T[]) => T
  ): T {
    let stack = this._stack.map((t) => mapper(t));
    for (let index = 0; index < stack.length; index += 1) {
      const token = stack[index];
      switch (token.type) {
        case TokenType.BinaryOp:
        case TokenType.ArgOp:
          const exec = execs[token.match];
          const narg = token.narg || exec.narg;
          index -= narg;
          const argTokens = stack.splice(index, narg);
          const opToken = stack.splice(index, 1)[0];
          const val = reducer(opToken, argTokens);
          stack.splice(index, 0, val);
          break;

        case TokenType.Push:
          stack.splice(index, 1); // Remove push operation
          index -= 2;
          stack.splice(index, 1); // Remove popped value.
          break;
      }
    }
    if (stack.length > 1) {
      console.warn("stack left over", stack);
    }
    return stack[0];
  }

  /**
   * Evaluate the RPN stack to calculate the result.
   */
  public calc(): number {
    return this.reduce<IValueToken>(
      (token: IToken) => ({
        ...token,
        value:
          token.type === TokenType.Number
            ? +token.match
            : token.type === TokenType.Constant
            ? constants[token.match]
            : undefined,
      }),
      (opToken: IValueToken, argTokens: IValueToken[]) => {
        const exec: IExec = execs[opToken.match];
        const val = exec.f(...argTokens.map((t) => t.value));
        return {
          position: opToken.position,
          type: TokenType.Number,
          match: "",
          value: val,
        };
      }
    ).value;
  }
}
