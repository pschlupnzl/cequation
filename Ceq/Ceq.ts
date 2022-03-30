import { constants, execs } from "./constants";
import { IExec } from "./IExec";
import { IToken, IValueToken, TokenType } from "./IToken";
import { flush, opArgs } from "./precedence";
import { TLexer } from "./TLexer";

/**
 * Class to process equations.
 */
class CEq {
  /**
   * Order in which to scan for tokens. The order only matters in those cases
   * where the tokens would look the same.
   */
  private static scanOrder: { [key: string]: TokenType[] } = {
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

  /** Negation: -2^2 = -4 (see Matlab), so handle negative as (-1)×. */
  private static negate: { [key: string]: IToken } = {
    value: {
      type: TokenType.Number,
      match: "-1",
      length: 0,
      position: 0,
    },
    op: {
      type: TokenType.BinaryOp,
      match: "*",
      length: 1,
      position: 0,
    },
  };

  /** Source string. */
  private _src: string = "";
  /** Parsed tokens. */
  public _tokens: IToken[] = [];
  /** RPN stack. */
  public _stack: IToken[] = [];

  constructor(src: string, tokens: IToken[], stack: IToken[]) {
    this._src = src;
    this._tokens = tokens;
    this._stack = stack;
  }

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
    console.log(`«${this._src}»`);
    return this;
  }

  public printTokens(): CEq {
    return this.print(this._tokens);
  }

  public printStack(): CEq {
    return this.print(this._stack);
  }

  /**
   * Parse a string of the form 1 + 2 * sin(pi / 4).
   */
  public static parse(src: string, lexer: TLexer): CEq {
    /** Input tokens. */
    const tokens: IToken[] = [];
    /** Assembling RPN stack. */
    const stack: IToken[] = [];
    /** Holding pen for operators being assembled. */
    const ops: IToken[] = [];
    /** Track bracket levels as offset value. */
    let bracket = 0;
    /** Hold process position for error handling. */
    let position: number;
    // /** Token matching. */
    // let match: string;
    try {
      let context: TokenType = TokenType.Number;
      for (position = 0; position < src.length; ) {
        // Skip blanks.
        let token = lexer(src, position, TokenType.Blank);
        if (token && token.length) {
          position += token.length;
          continue;
        }

        // Scan for expected token.
        for (let type of CEq.scanOrder[context]) {
          token = lexer(src, position, type);
          if (!!token) {
            break;
          }
        }
        if (!token) {
          throw new Error(`Expected ${context}`);
        }
        position += token.length;

        // Process the token.
        tokens.push(token);
        switch (context) {
          case TokenType.Number:
            switch (token.type) {
              case TokenType.Number:
              case TokenType.Constant:
                stack.push({ ...token, bracket });
                context = TokenType.BinaryOp;
                break;
              case TokenType.Open:
                bracket += 1;
                break;
              case TokenType.ArgOp:
                ops.push({ ...token, bracket });
                if (token.match !== "!") {
                  // NOT operator doesn't take brackets.
                  context = TokenType.Open;
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
                throw new Error(`Unhandled ${context} ${token.type}`);
            }
            break;

          case TokenType.BinaryOp:
            switch (token.type) {
              case TokenType.BinaryOp:
                flush(token, stack, ops, bracket);
                context = TokenType.Number;
                break;
              case TokenType.Push:
                flush(token, stack, ops, bracket);
                context = TokenType.Number;
                break;
              case TokenType.Close:
                bracket -= 1;
                break;
              default:
                throw new Error(`Unhandled ${context} ${token.type}`);
            }
            break;

          case TokenType.Open:
            switch (token.type) {
              case TokenType.Open:
                bracket += 1;
                context = TokenType.Number;
                break;
              default:
                throw new Error("Expected -(-");
            }
            break;
          default:
            throw new Error(`not yet implemented: ${context}`);
        }
      }
      flush(null, stack, ops, bracket);
      // Determine arg count for variable-argument functions.
      opArgs(stack);
    } catch (err) {
      console.error(
        `${err} ${src.substring(0, position)} →${src.substring(position)}`
      );
    }
    return new CEq(src, tokens, stack);
  }

  /**
   * Process the parsed token stack. This can be used e.g. to calculate the
   * equation final value, or to map to a different representation.
   * @param mapper Delegate to prepare the parsed token to the derived type.
   * @param reducer Delegate to receive operator tokens and their arguments,
   * returning the token to be substituted in place of the operator and all
   * arguments.
   */
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
          // console.log(`reduce ${token.match} ${token.type} ‡${narg}`);
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
      console.warn(`Stack left over! ${stack.map((t) => t.match).join(" • ")}`);
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
        try {
          const val = exec.f(...argTokens.map((t) => t.value));
          return {
            position: opToken.position,
            type: TokenType.Number,
            match: "",
            length: 0,
            value: val,
          };
        } catch (err) {
          console.log(opToken, exec);
          this.printSource().printTokens().printStack();
          throw err;
        }
      }
    ).value;
  }
}

export default CEq;
