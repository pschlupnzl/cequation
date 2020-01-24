(function (CEquation) {
    /**
     * Evaluate a single value token.
     * @param {object} token Token to evaluate.
     * @param {Array} valss Reference to array of stack. 
     * @param {function=} evalError Custom error handler.
     */
    const evalValueToken = function (token, valss, evalError) {
        valss.push({ value: token.value });
    };

    /**
     * Evaluate a binary operator token.
     * @param {object} token Token to evaluate.
     * @param {Array} valss Reference to array of stack. 
     * @param {function=} evalError Custom error handler.
     */
    const evalBinaryOpToken = function (token, valss, evalError) {
        if (valss.length < 2) {
            return evalError(CEquation.EVAL_ERROR.STACK_UNDERFLOW);
        }
        const OP = CEquation.OP;
        const arg2 = valss.pop();
        const arg1 = valss.pop();
        // TODO: Check units.
        // TODO: Check math errors.

        // Perform calculation.
        let vals;
        switch (token.op) {
            // case OP.PSH: valss.push(arg1); vals = arg2; break; // restore both to stack
            // case OP.POP: vals = arg2; break; // ignore first argument
            case OP.ADD: vals = { value: arg1.value + arg2.value }; break;
            case OP.SUB: vals = { value: arg1.value - arg2.value }; break;
            case OP.MUL: vals = { value: arg1.value * arg2.value }; break;
            case OP.DIV: vals = { value: arg1.value / arg2.value }; break;
            case OP.POW: vals = { value: arg1.value === 0 && arg2.value === 0 ? 1 : Math.pow(arg1.value, arg2.value) }; break;
            case OP.OR:  vals = { value: arg1.value !== 0 || arg2.value !== 0 ? 1 : 0 }; break;
            case OP.AND: vals = { value: arg1.value !== 0 && arg2.value !== 0 ? 1 : 0 }; break;
            case OP.LTE: vals = { value: arg1.value <= arg2.value ? 1 : 0 }; break;
            case OP.GTE: vals = { value: arg1.value >= arg2.value ? 1 : 0 }; break;
            case OP.LT : vals = { value: arg1.value <  arg2.value ? 1 : 0 }; break;
            case OP.GT : vals = { value: arg1.value >  arg2.value ? 1 : 0 }; break;
            case OP.NEQ: vals = { value: arg1.value != arg2.value ? 1 : 0 }; break;
            case OP.EQ : vals = { value: arg1.value == arg2.value ? 1 : 0 }; break;
            // TODO: More operators.
            default:
                return evalError(CEquation.EVAL_ERROR.UNKNOWN_BINARY_OP);
        }
        valss.push(vals);
    };

    /**
     * Evaluate a Unary operator token.
     * @param {object} token Token to evaluate.
     * @param {Array} valss Reference to array of stack. 
     * @param {function=} evalError Custom error handler.
     */
    const evalUnaryOpToken = function (token, valss, evalError) {
        if (valss.length < 1) {
            return evalError(CEquation.EVAL_ERROR.STACK_UNDERFLOW);
        }
        const OP = CEquation.OP;
        const M_PI_180 = CEquation.M_PI_180;
        const M_180_PI = CEquation.M_180_PI;
        const arg = valss.pop();
        let vals = { value: arg.value };
        switch (token.op - OP.UNARY) {
            case OP.ABS: vals.value = Math.abs(arg.value); break;
            case OP.SQRT: vals.value = Math.sqrt(arg.value); break;
            case OP.EXP: vals.value = Math.exp(arg.value); break;
            case OP.LOG10: vals.value = Math.log(arg.value) / Math.log(10.00); break;
            case OP.LOG: vals.value = Math.log(arg.value); break;
            case OP.CEIL: vals.value = Math.ceil(arg.value); break;
            case OP.FLOOR: vals.value = Math.floor(arg.value); break;
            case OP.ROUND: vals.value = Math.floor(arg.value + 0.500); break;
            case OP.COS: vals.value = Math.cos(arg.value); break;
            case OP.SIN: vals.value = Math.sin(arg.value); break;
            case OP.TAN: vals.value = Math.tan(arg.value); break;
            case OP.ACOS: vals.value = Math.acos(arg.value); break;
            case OP.ASIN: vals.value = Math.asin(arg.value); break;
            case OP.ATAN: vals.value = Math.atan(arg.value); break;
            case OP.COSH: vals.value = 0.5 * (Math.exp(arg.value) + Math.exp(-arg.value)); break;
            case OP.SINH: vals.value = 0.5 * (Math.exp(arg.value) - Math.exp(-arg.value)); break;
            case OP.TANH: vals.value = (Math.exp(2 * arg.value) - 1) / (Math.exp(2 * arg.value) + 1); break;
            case OP.SIND: vals.value = Math.sin(arg.value * M_PI_180); break;
            case OP.COSD: vals.value = Math.cos(arg.value * M_PI_180); break;
            case OP.TAND: vals.value = Math.tan(arg.value * M_PI_180); break;
            case OP.ASIND: vals.value = M_180_PI * Math.asin(arg.value); break;
            case OP.ACOSD: vals.value = M_180_PI * Math.acos(arg.value); break;
            case OP.ATAND: vals.value = M_180_PI * Math.atan(arg.value); break;
            case OP.NOT: vals.value = (arg.value == 0.00) ? 1.00 : 0.00; break;
            case OP.SIGN: vals.value = (arg.value == 0.00) ? 0.00 : (arg.value < 0.00) ? -1.00 : 1.00; break;
            default: 
                return evalError(CEquation.EVAL_ERROR.UNKNOWN_UNARY_OP);
        }
        valss.push(vals);
    };

    /**
     * Executes the equation, returning the result.
     * @param {Array} tokens Array of tokens.
     * @param {function=} evalError Custom error handler.
     */
    const eval = function (tokens, evalError) {
        evalError = evalError || CEquation.utils.evalError;
        const VOTYP = CEquation.VOTYP;
        const OP = CEquation.OP;
        const valss = [];
        tokens.forEach(function (token) {
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
                        return evalError("Operator type not yet implemented");
                    }
                    break;
                default: return evalError(CEquation.EVAL_ERROR.UNKNOWN_TOKEN_TYPE);
            }
        });

        //===Error handling====================================
        if (valss.length > 1) {
            return evalError(CEquation.EVAL_ERROR.STACK_NOT_EMPTY);
        }
        return valss.pop();
    };

    CEquation.eval = eval;
}(CEquation));