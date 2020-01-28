(function (CEquation) {
    "use strict";
    
    const parse = function (equation, parseError) {
        const OP = CEquation.OP;
        const LOOKFOR = CEquation.LOOKFOR;
        const VOTYP = CEquation.VOTYP;
        const PARSE_ERROR = CEquation.PARSE_ERROR;
        const Unit = CEquation.Unit;
        const utils = CEquation.utils;
        parseError = parseError || utils.parseError;

        let tokens = [];
        let opss = []; // Stack of pending operations.
        let bracketOffset = 0;
        let pos = 0;
        let lookFor = LOOKFOR.NUMBER;
        let parseLength = 0; // Number of characters parsed.

        while (pos < equation.length) {
            pos = utils.skipWhitespace(equation, pos);
            if (pos >= equation.length) {
                break;
            }
            
            parseLength = 0;
            const ch = equation[pos];
            let match;

            // console.log("Look for " + lookFor + " at -->" + equation.substr(pos));
            switch (lookFor) {

                //----------------------------------------
                //   Number, variable, function, unary.
                //----------------------------------------
                case LOOKFOR.NUMBER:
                    match = CEquation.UnaryOpRe.exec(equation.substr(pos));
                    if (match) {
                        const fn = match[1];
                        const op = CEquation.opch[fn];
                        opss.push({
                            op: op + OP.UNARY + bracketOffset,
                            pos: pos
                        });
                        parseLength = fn.length;
                        lookFor = LOOKFOR.BRACKET;
                        break;
                    }

                    //---dimensioned constant---
                    match = CEquation.SIConstRe.exec(equation.substr(pos));
                    if (match) {
                        const name = match[1];
                        const c = CEquation.SIConst[name];
                        tokens.push({
                            typ: VOTYP.VAL,
                            value: c.value,
                            unit: new Unit(c.units),
                            pos: pos
                        });
                        parseLength = name.length;
                        lookFor = LOOKFOR.BINARYOP;
                        break;
                    }

                    if (false) {
                        // valid char for 
                        // variables, 
                        // constants,
                        // unary,
                        // n-arg,
                        // unit,
                        // function
                        //---unary---
                    } else if (ch === "-") {
                        //---Negative sign---
                        // For sho':  -2^2 = -4 according to Matlab, so - sign must be
                        // processed before scanning for a number here
                        tokens.push({
                            typ: VOTYP.VAL,
                            value: -1.00,
                            unit: new Unit(),
                            pos: pos
                        });
                        opss.push({
                            op: OP.MUL + bracketOffset,
                            pos: pos
                        });
                        parseLength = 1;

                    } else if (ch === "+") {
                        //---Positive sign---
                        // nop
                        parseLength = 1;

                    } else if (ch === "(") {
                        //---Bracket---
                        bracketOffset += OP.BRACKETOFFSET;
                        parseLength = 1;

                    } else {
                        const scan = utils.scanNumber(equation, pos);
                        if (!scan) {
                            return parseError(equation, pos, PARSE_ERROR.NUMBER_EXPECTED, tokens);
                        }

                        tokens.push({
                            typ: VOTYP.VAL,
                            value: Number(scan),
                            unit: new Unit(),
                            pos: pos
                        });
                        parseLength = scan.length;
                        lookFor = LOOKFOR.BINARYOP;
                    }
                    break;

                //----------------------------------------
                //   Binary operator
                //----------------------------------------
                // How's this for crafty:
                // The Comma is essentially a binary operator!
                // It has the lowest priority, i.e., ALL other ope-
                // rations are carried  out on the current bracket,
                // and  it doesn't combine the two arguments into a
                // single value (in the evaluation routine, below.)
                case LOOKFOR.BINARYOP:
                    match = CEquation.BinaryOpRe.exec(equation.substr(pos));
                    if (match) {
                        const fn = match[1];
                        const op = CEquation.opch[fn] + bracketOffset;
                        const err = processOps(tokens, opss, op, bracketOffset);
                        if (err) {
                            return parseError(equation, pos, err, tokens);
                        }
                        opss.push({
                            op: op,
                            pos: pos
                        });
                        parseLength = fn.length;
                        lookFor = LOOKFOR.NUMBER;

                    } else if (ch === ")") {
                        //---Closing bracket---
                        // In order  to allow multi-argument  operators, we
                        // need to record the number of  arguments at parse
                        // time---the RPN stack has no knowledge of bracket
                        // levels when the equation is evaluated.

                        // TODO: n-arg
                        bracketOffset -= OP.BRACKETOFFSET;
                        parseLength = 1;
                    }


                    if (parseLength <= 0) {
                        return parseError(equation, pos, PARSE_ERROR.BINARY_OP_EXPECTED, tokens);
                    }
                    break;

                //----------------------------------------
                //   Bracket -(-
                //----------------------------------------
                case LOOKFOR.BRACKET:
                    if (ch === "(") {
                        bracketOffset += OP.BRACKETOFFSET;
                        parseLength = 1;
                        lookFor = LOOKFOR.NUMBER;
                    } else {
                        return parseError(equation, pos, PARSE_ERROR.BRACKET_EXPECTED, tokens);
                    }
                    break;

                default:
                    throw Error("lookFor not implemented: " + lookFor);
            }
            if (parseLength <= 0) {
                return parseError(equation, pos, PARSE_ERROR.NO_ADVANCE, tokens);
            }
            pos += parseLength;
        }

        // Remaining errors.
        if (bracketOffset > 0) {
            return parseError(equation, pos, PARSE_ERROR.BRACKETS_OPEN, tokens);
        }
        if (lookFor === LOOKFOR.BRACKET) {
            return parseError(equation, pos, PARSE_ERROR.BRACKET_EXPECTED, tokens);
        }
        if (lookFor === LOOKFOR.NUMBER) {
            return parseError(equation, pos, PARSE_ERROR.NUMBER_EXPECTED, tokens);
        }

        // Push remaining operations.
        const err = processOps(tokens, opss, -1, 0);
        if (err) {
            return parseError(equation, pos, err, tokens);
        }
        return tokens;
    };

/*********************************************************
* _ProcessOps                                     Private
* There are several places during parsing where the equa-
* tion needs to  be processed, e.g. to sequence  multiple
* binary  operators according to their precedence, or  at
* the end when no more tokens remain to be  parsed. Since
* the  processing  has become  quite elaborate  (operator
* precedence, variable-argument count specifiers, logical
* operator handling, assignment checking), this is now in
* a separate private function.
*
* Operators are  processed until the stack is empty or at
* the first operator on the stack whose precedence is in-
* ferior to the specified iThisOp.
*
* Comments:
*  - Relational Operators (<, <=, >, >=, ==, !=)
*    In common with Matlab (and C/C++?), these operations
*    are processed  left-to-right. We thus have to make a
*    special exception of NOT breaking out of the loop in
*    situations where the operator constant is lower.
*  - OP_PSH
*    Multiple  push operations cannot be collapsed  here;
*    we use them to count the number of  arguments when a
*    bracket  is closed. (They are not actually stored in
*    the final equation array.) We need iBrktOff for this
*    check.
*  - Variable-argument Functions
*    The number  of arguments supplied for variable argu-
*    ment functions is stored as  an integer in the isOps
*    stack when  a bracket is closed. Here, we add an ar-
*    gument count specifier to the equation stack immedi-
*    ately following the variable-argument function.
*  - OP_SET
*    Similarly, the  variable reference is stored on  the
*    isOps stack immediately  after an OP_SET;  it cannot
*    precede the OP_SET operation because it would be in-
*    terpreted as a  value-generating variable reference.
*    Note that  during processing, an expression  such as
*    (x = 3) assigns 3 to x, and also evaluates to 3. The
*    OP_POP operator (comma)  can be used to discard such
*    assignments, if necessary.
*
* Returns an error code, e.g. EQERR_PARSE_STACKOVERFLOW.
*********************************************************/
const processOps = function (tokens, opss, thisOp, bracketOffset) {
    const OP = CEquation.OP;
    const VOTYP = CEquation.VOTYP;
    do {
        if (opss.length <= 0) {
            break;
        }

        let prevOp = opss[opss.length - 1].op; // Examine previous operation.
        //---Relational------
        if (prevOp < thisOp) { // Check lower priority.
            if (prevOp < OP.RELOPMIN || prevOp > OP.RELOPMAX
                || thisOp < OP.RELOPMIN || thisOp > OP.RELOPMAX) {
                // Unless both relops, exit on lower precedence.
                break;
            }
        }

        //---Push-----
        if (thisOp === OP.PSH + bracketOffset && prevOp === thisOp) {
            // Retain multi-argument push.
            break;
        }

        //---Previous op---
        const prevOps = opss.pop();
        const prevPos = prevOps.pos;
        prevOp = prevOps.op % OP.BRACKETOFFSET;
        tokens.push({
            typ: VOTYP.OP,
            op: prevOp,
            pos: prevPos
        });

        //---Set---
        // TODO.
        //---Variable-arg---
        // TODO.
        
    } while(true);
};

    CEquation.parse = parse;
}(CEquation));