(function (CEquation) {
    /**
     * Operator constants. These are also precedence values.
     */
    CEquation.OP = {
        NULL: 0,
        POP: 1,          // remove (comma in non-multi situations)
    
        BINARYMIN: 2,    // first searchable binary operator
        //                  | - equal
        PSH: 2,          // comma (Push) binary op
        SET: 3,          // set (variable = expression)
        OR: 4,           // or ||
        AND: 5,          // and &&
    
        RELOPMIN: 6,     // start of relational operators
        LTE: 6,          // less or equal <=
        GTE: 7,          // greater or equal >=
        LT: 8,           // less than <
        GT: 9,           // greater than >
        NEQ: 10,         // not equal !=
        EQ: 11,          // equal ==
        RELOPMAX: 11,    // end of relation operators
    
        ADD: 12,         // ascending in precedence order
        SUB: 13,
        MUL: 14,
        DIV: 15,
        POW: 16,
        //                  | - equal
        BINARYMAX: 16,   // last real binary operator
    
        UNARY: 20,       // unary ops have OP_UNARY added
        ABS: 0,
        SQRT: 1,
        EXP: 2,
        LOG: 3,
        LOG10: 4,
        CEIL: 5,
        FLOOR: 6,
        COS: 7,
        SIN: 8,
        TAN: 9,
        ACOS: 10,
        ASIN: 11,
        ATAN: 12,
        COSH: 13,
        SINH: 14,
        TANH: 15,
        SIND: 16,
        COSD: 17,
        TAND: 18,
        ASIND: 19,
        ACOSD: 20,
        ATAND: 21,
        NOT: 22,         // not !
        SIGN: 23,
        ROUND: 24,
        NUM_UNARYOP: 25, // number of defined unary ops
    
        NARG: 50,        // n-arg ops have OP_NARG added
        NARG_MOD: 0,
        NARG_REM: 1,
        NARG_ATAN2: 2,
        NARG_ATAN2D: 3,
        NARG_MAX: 4,
        NARG_MIN: 5,
        NARG_IF: 6,
        NUM_NARGOP: 7,   // number of define n-arg ops
    
        BRACKETOFFSET: 100, // added for each nested bracket
    };

    /**
     * Two-character binary operator match.
     */
    CEquation.opch2 = {
        "||": CEquation.OP.OR,
        "!=": CEquation.OP.NEQ,
        "==": CEquation.OP.EQ,
        "&&": CEquation.OP.AND,
        "<=": CEquation.OP.LTE,
        ">=": CEquation.OP.GTE,
    };

    /**
     * Single-character binary operator match.
     */
    CEquation.opch = {
        "," : CEquation.OP.PSH,
        "+" : CEquation.OP.ADD,
        "-" : CEquation.OP.SUB,
        "*" : CEquation.OP.MUL,
        "/" : CEquation.OP.DIV,
        "^" : CEquation.OP.POW,
        "|" : CEquation.OP.OR,
        "&" : CEquation.OP.AND,
        "<" : CEquation.OP.LT,
        ">" : CEquation.OP.GT,
        "=" : CEquation.OP.SET,
    };

    /**
     * Lexer parse status.
     */
    CEquation.LOOKFOR = {
        NUMBER: "number",      // number, unary op, parentheses, negative, constant
        BINARYOP: "binaryop",  // binary op only
        BRACKET: "bracket"     // brackets only (after unary op)
    };

    /**
     * Token types.
     */
    CEquation.VOTYP = {
        UNDEFINED: "undefined", // undefined
        VAL: "val",       // valop is numeric value
        OP: "op",         // valop is built-in operator or function
        REF: "ref",       // valop is index into variable array
        UNIT: "unit",     // unit: immediate multiply by value (not used?)
        NARGC: "nargc",   // n-argument count whenever bracket is closed
        PREFIX: "prefix", // same effect as TYP_VAL (not used?)
    };

    /**
     * Errors.
     */
    CEquation.PARSE_ERROR = {
        NUMBER_EXPECTED: "NUMBER_EXPECTED",       // looking for number, (, -sign, or unary op
        // UNKNOWNFUNCVAR: "UNKNOWNFUNCVAR",
        BRACKET_EXPECTED: "BRACKET_EXPECTED",     // expecting ( (after unary operator)
        BINARY_OP_EXPECTED: "BINARY_OP_EXPECTED", // expecting +-*/^ operator
        BRACKETS_OPEN: "BRACKETS_OPEN",           // not enough closing brackets
        // UNOPENEDBRACKET: "UNOPENEDBRACKET",     // not enough opening brackets
        NO_ADVANCE: "NO_ADVANCE",                 // current token failed to advance iThisScan
        // CONTAINSVAR: "CONTAINSVAR",             // contains vars when not permitted
        // NARGBADCOUNT: "NARGBADCOUNT",           // wrong number of arguments to function
        // STACKOVERFLOW: "STACKOVERFLOW",         // stack overflow, too many ops
        // ASSIGNNOTVAR: "ASSIGNNOTVAR",           // assignment needs variable
        // ASSIGNNOTALLOWED: "ASSIGNNOTALLOWED",   // assignment not allowed
        // UNITEXPECTED: "UNITEXPECTED",           // expected unit after "in" keyword
        // UNITALREADYDEF: "UNITALREADYDEF",       // target unit already defined
        // UNITINCOMPATIBLE: "UNITINCOMPATIBLE",   // incompatible unit
        // ILLEGALCHAR: "ILLEGALCHAR",             // illegal character
    };

    CEquation.EVAL_ERROR = {
        // UNKNOWNBINARYOP: "UNKNOWNBINARYOP",    // Unknown binary operator
        // UNKNOWNUNARYOP: "UNKNOWNUNARYOP",    // Unknown unary operator
        // UNKNOWNNARGOP: "UNKNOWNNARGOP",    // Unkown n-arg operator
        UNKNOWN_TOKEN_TYPE: "UNKNOWN_TOKEN_TYPE",    // Unknown Valop type
        STACK_NOT_EMPTY: "STACK_NOT_EMPTY",    // Stack not empty at end of equation
        STACK_UNDERFLOW: "STACK_UNDERFLOW",    // Stack hasn't enough entries
        // CONTAINSVAR: "CONTAINSVAR",    // contains variables than are not supplied
        // BADTOKEN: "BADTOKEN",    // not right type of token
        // ASSIGNNOTALLOWED: "ASSIGNNOTALLOWED",    // not allowed to change variables
        // UNITMISMATCH: "UNITMISMATCH",    // mismatched units
        // UNITNOTDIMLESS: "UNITNOTDIMLESS",    // unit on expected dimensionless arg
        // NOEQUATION: "NOEQUATION",    // there is no equation to evaluate
    };
}(CEquation));

