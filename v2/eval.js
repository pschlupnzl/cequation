(function (CEquation) {
    "use strict";

    /**
     * Evaluate a single value token.
     * @param {object} token Token to evaluate.
     * @param {Array} valss Reference to array of stack. 
     * @param {function} evalError Custom error handler (not used).
     */
    const evalValueToken = function (token, valss, evalError) {
        valss.push({ 
            value: token.value,
            unit: token.unit,
            pos: token.pos
        });
    };

    /**
     * Evaluate a binary operator token.
     * @param {object} token Token to evaluate.
     * @param {Array} valss Reference to array of stack. 
     * @param {function} evalError Custom error handler.
     */
    const evalBinaryOpToken = function (token, valss, evalError) {
        if (valss.length < 2) {
            return evalError(0, CEquation.EVAL_ERROR.STACK_UNDERFLOW);
        }
        const OP = CEquation.OP;
        const Unit = CEquation.Unit;
        const arg2 = valss.pop();
        const arg1 = valss.pop();

        // TODO: Check math errors.

        // Check units.
        switch (token.op) {
            case OP.ADD:
            case OP.SUB:
                if (!arg1.unit.same(arg2.unit)) {
                    return evalError(arg2.pos, CEquation.EVAL_ERROR.UNIT_MISMATCH); 
                }
                break;
            case OP.POW:
                if (!arg2.unit.isDimensionless()) {
                    return evalError(arg2.pos, CEquation.EVAL_ERROR.UNIT_NOT_DIMLESS);
                }
                break;
        }

        // Perform calculation.
        let vals;
        switch (token.op) {
            // case OP.PSH: valss.push(arg1); vals = arg2; break; // restore both to stack
            // case OP.POP: vals = arg2; break; // ignore first argument
            case OP.ADD: vals = Unit.addValues(arg1, arg2); break;
            case OP.SUB: vals = Unit.addValues(arg1, arg2, true); break;
            case OP.MUL: vals = Unit.multiplyValues(arg1, arg2); break;
            case OP.DIV: vals = Unit.multiplyValues(arg1, arg2, true); break;
            case OP.POW: vals = { value: arg1.value === 0 && arg2.value === 0 ? 1 : Math.pow(arg1.value, arg2.value), unit: arg1.unit.power(arg2.value) }; break;
            case OP.OR:  vals = { value: arg1.value !== 0 || arg2.value !== 0 ? 1 : 0, unit: new Unit() }; break;
            case OP.AND: vals = { value: arg1.value !== 0 && arg2.value !== 0 ? 1 : 0, unit: new Unit() }; break;
            case OP.LTE: vals = { value: arg1.value <= arg2.value ? 1 : 0, unit: new Unit() }; break;
            case OP.GTE: vals = { value: arg1.value >= arg2.value ? 1 : 0, unit: new Unit() }; break;
            case OP.LT : vals = { value: arg1.value <  arg2.value ? 1 : 0, unit: new Unit() }; break;
            case OP.GT : vals = { value: arg1.value >  arg2.value ? 1 : 0, unit: new Unit() }; break;
            case OP.NEQ: vals = { value: arg1.value != arg2.value ? 1 : 0, unit: new Unit() }; break;
            case OP.EQ : vals = { value: arg1.value == arg2.value ? 1 : 0, unit: new Unit() }; break;
            // TODO: More operators.
            default:
                return evalError(token.pos, CEquation.EVAL_ERROR.UNKNOWN_BINARY_OP);
        }
        vals.pos = token.pos;
        valss.push(vals);
    };

    /**
     * Evaluate a Unary operator token.
     * @param {object} token Token to evaluate.
     * @param {Array} valss Reference to array of stack. 
     * @param {function} evalError Custom error handler.
     */
    const evalUnaryOpToken = function (token, valss, evalError) {
        if (valss.length < 1) {
            return evalError(0, CEquation.EVAL_ERROR.STACK_UNDERFLOW);
        }
        const OP = CEquation.OP;
        const Unit = CEquation.Unit;
        const M_PI_180 = CEquation.M_PI_180;
        const M_180_PI = CEquation.M_180_PI;
        const arg = valss.pop();
        
        // Check dimensions.
        switch (token.op - OP.UNARY) {
            case OP.EXP:
            case OP.LOG10:
            case OP.LOG:
            case OP.COS:
            case OP.SIN:
            case OP.TAN:
            case OP.ACOS:
            case OP.ASIN:
            case OP.ATAN:
            case OP.COSH:
            case OP.SINH:
            case OP.TANH:
            case OP.SIND:
            case OP.COSD:
            case OP.TAND:
            case OP.ASIND:
            case OP.ACOSD:
            case OP.ATAND:
            case OP.NOT:
                if (!arg.unit.isDimensionless()) {
                    return evalError(token.pos, CEquation.EVAL_ERROR.UNIT_NOT_DIMLESS);
                }
                break;
        }
            
        // Perform calculation.
        let vals;
        switch (token.op - OP.UNARY) {
            case OP.ABS: vals = { value: Math.abs(arg.value), unit: arg.unit }; break;
            case OP.SQRT: vals = { value: Math.sqrt(arg.value), unit: arg.unit.power(0.5) }; break;
            case OP.EXP: vals = { value: Math.exp(arg.value) }; break;
            case OP.LOG10: vals = { value: Math.log10(arg.value) }; break;
            case OP.LOG: vals = { value: Math.log(arg.value) }; break;
            case OP.CEIL: vals = { value: Math.ceil(arg.value), unit: arg.unit }; break;
            case OP.FLOOR: vals = { value: Math.floor(arg.value), unit: arg.unit }; break;
            case OP.ROUND: vals = { value: Math.floor(arg.value + 0.500), unit: arg.unit }; break;
            case OP.COS: vals = { value: Math.cos(arg.value) }; break;
            case OP.SIN: vals = { value: Math.sin(arg.value) }; break;
            case OP.TAN: vals = { value: Math.tan(arg.value) }; break;
            case OP.ACOS: vals = { value: Math.acos(arg.value) }; break;
            case OP.ASIN: vals = { value: Math.asin(arg.value) }; break;
            case OP.ATAN: vals = { value: Math.atan(arg.value) }; break;
            case OP.COSH: vals = { value: 0.5 * (Math.exp(arg.value) + Math.exp(-arg.value)) }; break;
            case OP.SINH: vals = { value: 0.5 * (Math.exp(arg.value) - Math.exp(-arg.value)) }; break;
            case OP.TANH: vals = { value: (Math.exp(2 * arg.value) - 1) / (Math.exp(2 * arg.value) + 1) }; break;
            case OP.SIND: vals = { value: Math.sin(arg.value * M_PI_180) }; break;
            case OP.COSD: vals = { value: Math.cos(arg.value * M_PI_180) }; break;
            case OP.TAND: vals = { value: Math.tan(arg.value * M_PI_180) }; break;
            case OP.ASIND: vals = { value: M_180_PI * Math.asin(arg.value) }; break;
            case OP.ACOSD: vals = { value: M_180_PI * Math.acos(arg.value) }; break;
            case OP.ATAND: vals = { value: M_180_PI * Math.atan(arg.value) }; break;
            case OP.NOT: vals = { value: (arg.value == 0.00) ? 1.00 : 0.00 }; break;
            case OP.SIGN: vals = { value: (arg.value == 0.00) ? 0.00 : (arg.value < 0.00) ? -1.00 : 1.00, unit: arg.unit }; break;
            default: 
                return evalError(token.pos, CEquation.EVAL_ERROR.UNKNOWN_UNARY_OP);
        }
        vals.unit = vals.unit || new Unit();
        vals.pos = token.pos;
        valss.push(vals);
    };

    /**
     * Evaluate a units token.
     * @param {object} token Token to evaluate.
     * @param {Array} valss Reference to array of stack. 
     * @param {function} evalError Custom error handler.
     */
    const evalUnitToken = function (token, valss, evalError) {
        if (valss.length < 1) {
            return evalError(0, CEquation.EVAL_ERROR.STACK_UNDERFLOW);
        }
        const vals = valss.pop();
        vals.unit = vals.unit.mult(token.unit);
        valss.push(vals);
    };

    /**
     * Executes the equation, returning the result.
     * @param {Array} tokens Array of tokens.
     * @param {function=} evalError Custom error handler.
     */
    const evaluate = function (tokens, evalError) {
        evalError = evalError || CEquation.utils.evalError;
        if (!tokens) {
            return evalError(0, CEquation.EVAL_ERROR.BAD_TOKEN);
        }
        const VOTYP = CEquation.VOTYP;
        const OP = CEquation.OP;
        const valss = [];
        tokens.forEach(token => {
            switch (token.typ) {
                case VOTYP.VAL:
                    evalValueToken(token, valss, evalError);
                    break;

                case VOTYP.OP:
                    const op = token.op;
                    if (op < OP.UNARY) {
                        evalBinaryOpToken(token, valss, evalError);
                    } else if (op < OP.NARG) {
                        evalUnaryOpToken(token, valss, evalError);
                    } else {
                        return evalError(0, "Operator type not yet implemented");
                    }
                    break;
                    
                case VOTYP.UNIT:
                    evalUnitToken(token, valss, evalError);
                    break;
                    
                default: return evalError(token.pos, CEquation.EVAL_ERROR.UNKNOWN_TOKEN_TYPE);
            }
        });

        //===Error handling====================================
        if (valss.length > 1) {
            return evalError(0, CEquation.EVAL_ERROR.STACK_NOT_EMPTY);
        }
        return valss.pop();
    };

    CEquation.evaluate = evaluate;
}(CEquation));