export enum TokenType {
  /** Blank. */
  Blank = "blank",
  /** Number, e.g. 1.234e12 (excludes negative sign). */
  Number = "number",
  /** Binary operator, e.g. + - * /. */
  BinaryOp = "binaryop",
  /** Opening parenthesis. */
  Open = "open",
  /** Closing parethesis. */
  Close = "close",
  /** Push argument, i.e. comma. */
  Push = "push",
  /** Operator with argument, e.g. sin(), max(), ...; also "!". */
  ArgOp = "argop",
  /** Constants, e.g. pi. */
  Constant = "constant",
}

/** Tokenized string. */
export interface IToken {
  /** Token type. */
  type: TokenType;
  /** Location in source string. */
  position: number;
  /** The matched token string. */
  match: string;
  /** Precedence elevated by brackets. */
  bracket?: number;
  /** Number of arguments for vari-arg operators. */
  narg?: number;
}

export interface IValueToken extends IToken {
  /** Numerical value, for numbers and constants. */
  value?: number;
}

export interface INodeToken extends IToken {
  /** Parent node. */
  parent?: INodeToken;
  /** Child nodes. */
  children?: INodeToken[];
}
