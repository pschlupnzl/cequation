import { argops, execs } from "./constants";
import { IToken, TokenType } from "./IToken";

const precedence = {
  ",": 2,
  "+": 12,
  "-": 13,
  "*": 14,
  "/": 15,
  "^": 16,
};

/**
 * Handle operator precedence, consolidating stack and ops.
 * @param newToken Token being added. May be NULL when flushing at end of parse.
 * @param stack Stack of tokens where to push pending operations.
 * @param ops Stack of operations to check and flush.
 * @param bracket Bracket level being flushed.
 */
export const flush = (
  newToken: IToken | null,
  stack: IToken[],
  ops: IToken[],
  bracket: number
) => {
  while (ops.length) {
    const prev = ops[ops.length - 1];
    if (
      // Flush all at end.
      !newToken ||
      // Flush all higher bracket levels.
      prev.bracket > bracket ||
      // Flush all higher precedence operators at this bracket.
      (prev.bracket === bracket &&
        (precedence[prev.match] >= precedence[newToken.match] ||
          // Operators with arguments (i.e., functions) have higher precedence.
          prev.type === TokenType.ArgOp))
    ) {
      stack.push(ops.pop());
    } else {
      break;
    }
  }
  if (newToken) {
    ops.push({ ...newToken, bracket });
  }
};

/**
 * Process vari-arg operators, replacing push operations with n-arg counts.
 */
export const opArgs = (tokens: IToken[]) => {
  for (let position = 0; position < tokens.length; position += 1) {
    const token = tokens[position];
    if (token.type === TokenType.ArgOp) {
      const exec = execs[token.match];
      if (exec.narg !== 1) {
        // For non-unary operators, scan backwards and clean out all PUSH ops at
        // the level immediately above the current bracket.
        const bracket = token.bracket;
        let narg = 1;
        for (
          let pos = position - 1;
          pos >= 0 && tokens[pos].bracket > bracket;
          pos -= 1
        ) {
          const tok = tokens[pos];
          if (tok.type === TokenType.Push && tok.bracket === bracket + 1) {
            narg += 1;
            tokens.splice(pos, 1);
            position -= 1;
          }
        }
        if (exec.narg < 0) {
          token.narg = narg;
        }
      }
    }
  }
};
