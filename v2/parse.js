(function (CEquation) {
    "use strict";
    
    /**
     * ParseEquationUnits
     * Parses the  token at  the current equation  position in
     * terms of recognized units. This might happen:
     *  - After a number, when a binary  operator is expected,
     *    e.g. "1.5 s"
     *  - After a division sign, e.g. "3.1 V/A". In this case,
     *    the number "1" is inserted to read "3.1 V / 1 A" and
     *    the multiplication has higher precedence.
     * @param {string} equation Original equation where to match.
     * @param {number} pos Position in original equation.
     * @param {Array} tokens Array of tokens to append and inspect.
     * @param {boolean=} padWithValue Optional value indicating that a
     *    "1" value token should be added if the unit is matched. This
     *    is used when scanning for a unit in place of a number.
     * @returns {number} Number of characters spanned, or 0 for no match.
     */
    // int CEquation::_ParseEquationUnits(const char *_szEqtn, int iThisPt, int iBrktOff, TEqStack<int> &isOps, TEqStack<int> &isPos, TEqStack<VALOP> &vosParsEqn, UINT uLookFor) {
    const parseEquationUnits = function (equation, pos, tokens, padWithValue) {
        const VOTYP = CEquation.VOTYP;
        const Unit = CEquation.Unit;

        /** Array of units being assembled. */
        let units = [];

        /** Apply a newly matched unit to the unit total. */
        const pushUnit = function (inverted, symbol, prefix) {
            let unit = new Unit(symbol, prefix, inverted ? -1 : 1);
            units.push(unit);
            return symbol.length + (prefix ? prefix.length : 0);
        };

        // Scan whole unit including powers and slashes e.g. kgm^s/s^3.
        // Expressions such as 3/s are not atomic here, they are parsed
        // into tokens [3, 1s, div].
        let totalLength = 0;
        let inverted = false; // Sign of power, -ve after division solidus.
        while (pos < equation.length) {
            let parseLength = 0;
            const subeq = equation.substr(pos);
            let matchExponent
            let matchPrefix;
            let matchSymbol;
            
            if (units.length > 0 && subeq[0] === "/") {
                // Prepare for next unit to be inverted.
                inverted = true;
                parseLength = 1;
            } else if (units.length > 0 && (matchExponent = /^\^(\-?[0-9]+)/.exec(subeq)) !== null) {
                // Match a whole exponent.
                const exponent = matchExponent[1];
                units[units.length - 1] = units[units.length - 1].power(+exponent);
                parseLength = exponent.length + 1;
            } else if ((matchPrefix = CEquation.SIPrefixRe.exec(subeq)) !== null
                && (matchSymbol = CEquation.SIInputUnitsRe.exec(subeq.substr(1))) !== null) {
                // Match prefix and unit.
                parseLength = pushUnit(inverted, matchSymbol[1], matchPrefix[1]);
                inverted = false;
            } else if ((matchSymbol = CEquation.SIInputUnitsRe.exec(subeq)) !== null) {
                // Matching unit alone.
                parseLength = pushUnit(inverted, matchSymbol[1]);
                inverted = false;
            }

            if (parseLength === 0) {
                break;
            }
            totalLength += parseLength;
            pos += parseLength;
        }

        // Remove trailing slash from scan.
        if (inverted) {
            totalLength -= 1;
        }

        // Apply unit.
        if (units.length > 0
            && tokens.length >= 1) {
            // Pad with number if needed, e.g. after an operator where
            // a number might have been expected.
            if (padWithValue) {
                tokens.push({
                    typ: VOTYP.VAL,
                    value: 1.0,
                    unit: new Unit(),
                    pos: pos
                });
            }

            const prevToken = tokens[tokens.length - 1];
            if (prevToken.typ === VOTYP.VAL) {
                const totalUnit = units.reduce((prev, curr) => prev.mult(curr), new Unit());
                prevToken.unit = prevToken.unit.mult(totalUnit);
            }
        }
        return totalLength;
    }
 

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
            const subeq = equation.substr(pos);
            let match;

            switch (lookFor) {

                //----------------------------------------
                //   Number, variable, function, unary.
                //----------------------------------------
                case LOOKFOR.NUMBER:
                    match = CEquation.UnaryOpRe.exec(subeq);
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
                    match = CEquation.SIConstRe.exec(subeq);
                    if (match) {
                        const name = match[1];
                        const c = CEquation.SIConst[name];
                        tokens.push({
                            typ: VOTYP.VAL,
                            value: c.value,
                            unit: new Unit("", c.units),
                            pos: pos
                        });
                        parseLength = name.length;
                        lookFor = LOOKFOR.BINARYOP;
                        break;
                    }

                    //---Unit---
                    parseLength = parseEquationUnits(equation, pos, tokens, true);
                    if (parseLength > 0) {
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
                    match = CEquation.BinaryOpRe.exec(subeq);
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
                        break;

                    } else if (ch === ")") {
                        //---Closing bracket---
                        // In order  to allow multi-argument  operators, we
                        // need to record the number of  arguments at parse
                        // time---the RPN stack has no knowledge of bracket
                        // levels when the equation is evaluated.

                        // TODO: n-arg
                        bracketOffset -= OP.BRACKETOFFSET;
                        parseLength = 1;
                        break;
                    }

                    //---Units---
                    parseLength = parseEquationUnits(equation, pos, tokens);
                    if (parseLength > 0) {
                        break;
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