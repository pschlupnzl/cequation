(function (CEquation) {
    "use strict";
    
    /*********************************************************
    * ParseEquationUnits                              Private
    * Parses the  token at  the current equation  position in
    * terms of recognized units. This might happen:
    *  - After a number, when a binary  operator is expected,
    *    e.g. "1.5 s"
    *  - After a division sign, e.g. "3.1 V/A". In this case,
    *    the number "1" is inserted to read "3.1 V / 1 A" and
    *    the multiplication has higher precedence.
    * Returns iThisScan
    *********************************************************/
    // int CEquation::_ParseEquationUnits(const char *_szEqtn, int iThisPt, int iBrktOff, TEqStack<int> &isOps, TEqStack<int> &isPos, TEqStack<VALOP> &vosParsEqn, UINT uLookFor) {
    const parseEquationUnits = function (subeq, pos, tokens) {
        let matchPrefix;
        let matchUnit;

        /** Push a new unit token, optionally with prefix, onto token stack. */
        const pushUnit = function (unitName, prefixName) {
            let unit = new CEquation.Unit(CEquation.SIUnits[unitName]);
            if (prefixName) {
                unit = unit.scalar(CEquation.SIPrefix[prefixName]);
            }

            const prevToken = tokens[tokens.length - 1];
            if (prevToken && prevToken.typ === CEquation.VOTYP.UNIT) {
                prevToken.unit = prevToken.unit.mult(unit);
            } else {
                tokens.push({
                    typ: CEquation.VOTYP.UNIT,
                    unit: unit,
                    pos: pos
                });
            }
            return unitName.length + (prefixName ? prefixName.length : 0);
        };

        // Try matching with prefix first.
        matchPrefix = CEquation.SIPrefixRe.exec(subeq);
        matchUnit = CEquation.SIInputUnitsRe.exec(subeq.substring(1));
        if (matchPrefix && matchUnit) {
            return pushUnit(matchUnit[1], matchPrefix[1]);
        }

        // Try matching unit alone.
        matchUnit = CEquation.SIInputUnitsRe.exec(subeq);
        if (matchUnit) {
            return pushUnit(matchUnit[1]);
        }    
        
        return 0;


        // int   iThisScan;                         // advance this scan location
        // char *pszSt;                             // offset into character arrays
        // int   iTokLen;                           // token length
        // int   iPrfx;                             // prefix index
        // int   iUnit;                             // loop counter
        // int   iThisOp;                           // unit multiplier
        // VALOP voThisValop;                       // value/operator to push onto stack
    
        // iThisScan =  0;                          // found no unit yet
        // iPrfx     = -1;                          // no prefix yet
    
        // //---Get token length------------------------
        // for(iTokLen=1; (iThisPt+iTokLen<(int)strlen(_szEqtn)) && strchr(EQ_VALIDUNIT, _szEqtn[iThisPt+iTokLen]); iTokLen++);
        // if(iTokLen<=0) return(0);                // ignore bad token
    
        // //---Scan for Unit---------------------------
        // do {                                     // search twice: once with and then without prefix
        // pszSt = (char*) CEquationSIUnitStr;      // start at beginning of string
        // for(iUnit = 0; iUnit < EQSI_NUMUNIT_INPUT; iUnit++) {
        //     if( strncmp(_szEqtn+iThisPt, pszSt, MAX((int)strlen(pszSt), iTokLen)) == 0 ) {
        //         //---hanging---
        //         if(uLookFor == LOOKFOR_NUMBER) {
        //             iThisOp = isOps.Peek(); while(iThisOp > OP_BRACKETOFFSET) iThisOp -= OP_BRACKETOFFSET;
        //             switch(iThisOp) {
        //             case OP_DIV:                 // hanging / --> add "1"
        //             voThisValop.uTyp = VOTYP_PREFIX; // scale factor
        //             voThisValop.dVal = 1.00;
        //             voThisValop.iPos = iThisPt;
        //             vosParsEqn.Push(voThisValop); // push scale factor
        //             iBrktOff += OP_BRACKETOFFSET; // higher precedence
        //             break;
        //             case OP_MUL:                 // after "*" not needed
        //             isOps.Pop();              // remove the multiplication
        //             isPos.Pop();
        //             break;
        //             default:                     // everything else is an error
        //             iError = EQERR_PARSE_NUMBEREXPECTED;
        //             return(0);
        //             }
        //         } else {
        //             iThisOp = iBrktOff + OP_BRACKETOFFSET; // do everthing higher than me
        //             _ProcessOps(&vosParsEqn, &isOps, &isPos, iThisOp, iBrktOff);
        //         }
    
        //         //---prefix---
        //         if(iPrfx>=0) {
        //             if(iError != EQERR_NONE) return(0);
        //             voThisValop.uTyp = VOTYP_PREFIX; // scale factor
        //             voThisValop.dVal = CEquationSIUnitPrefix[iPrfx];
        //             voThisValop.iPos = iThisPt;
        //             vosParsEqn.Push(voThisValop); // push scale factor
        //             isOps.Push(OP_MUL + iBrktOff);
        //             isPos.Push(iThisPt);
        //         }
    
        //         //---unit---
        //         iThisOp = isOps.Peek(); while(iThisOp>OP_BRACKETOFFSET) iThisOp-=OP_BRACKETOFFSET;
        //         iThisOp = OP_MUL + iBrktOff + (iThisOp==OP_DIV)*OP_BRACKETOFFSET;
        //         voThisValop.uTyp  = VOTYP_UNIT;
        //         voThisValop.iUnit = iUnit;
        //         voThisValop.iPos  = iThisPt;       // store const's position
        //         vosParsEqn.Push(voThisValop);      // save this const*/
        //         _ProcessOps(&vosParsEqn, &isOps, &isPos, iThisOp, iBrktOff);
        //         iThisScan = strlen(pszSt) + ((iPrfx>=0) ? 1 : 0); // length of this scan
        //         iPrfx = -9999;                     // stop searching prefixes
        //         break;                             // stop looking
        //     }
        //     pszSt += strlen(pszSt) + 1;           // advance to next part in string
        // }
        // if(iPrfx <= -9999) break;
    
        // //---Scan for prefix-------------------------
        // for(iPrfx=0; iPrfx<EQSI_NUMUNIT_PREFIX; iPrfx++)
        //     if(CEquationSIUnitPrefixStr[iPrfx] == _szEqtn[iThisPt]) break;
        // if(iPrfx >= EQSI_NUMUNIT_PREFIX) break; // skip if not found
        // iThisPt++;                            // start back up one
        // iTokLen--;                            // string is one char longer
        // } while(1);
        return(iThisScan);
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
                    parseLength = parseEquationUnits(subeq, pos, tokens);
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