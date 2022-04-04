import { IToken, TokenType } from "./IToken";

export interface ILexerScan {
  skip: number;
  tokens: IToken[];
}

/** State maintained between calls to scan. */
export type TScanState = object;

/**
 * Lexer function that scans the source text at the given location and returns
 * the read token.
 * @param src Source string.
 * @param position Index into source string where to scan.
 * @param context Context to scan for.
 */
export type TLexer = (
  src: string,
  position: number,
  context: TokenType,
  state: TScanState
) => ILexerScan | undefined;
