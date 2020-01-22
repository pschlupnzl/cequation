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
            case OP.PSH: valss.push(arg1); vals = arg2; break; // restore both to stack
            case OP.POP: vals = arg2; break; // ignore first argument
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
                return evalError("!! Not yet implemented");
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