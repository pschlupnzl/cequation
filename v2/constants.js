(function (CEquation) {
    "use strict";
    
    const M_PI = Math.PI;
    CEquation.M_PI = M_PI;
    CEquation.M_PI_180 = M_PI / 180.0;
    CEquation.M_180_PI = 180.0 / M_PI;

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

    CEquation.BinaryOpRe =
        /^(\+|-|\*|\/|\^|\|\||&&|<=|>=|==|<|>|=|!=)/;
 
    CEquation.UnaryOpRe =
        /^(round|asind|acosd|atand|log10|floor|asin|atan|cosh|sinh|tanh|sind|cosd|tand|sqrt|sign|ceil|abs|exp|log|cos|sin|tan|acos|!)/;

    /**
     * Operator match.
     */
    CEquation.opch = {
        "atan2d": CEquation.OP.NARG_ATAN2D,
        "floor": CEquation.OP.FLOOR,
        "log10": CEquation.OP.LOG10,
        "asind": CEquation.OP.ASIND,
        "acosd": CEquation.OP.ACOSD,
        "atand": CEquation.OP.ATAND,
        "round": CEquation.OP.ROUND,
        "atan2": CEquation.OP.NARG_ATAN2,
        "sqrt": CEquation.OP.SQRT,
        "ceil": CEquation.OP.CEIL,
        "acos": CEquation.OP.ACOS,
        "asin": CEquation.OP.ASIN,
        "atan": CEquation.OP.ATAN,
        "cosh": CEquation.OP.COSH,
        "sinh": CEquation.OP.SINH,
        "tanh": CEquation.OP.TANH,
        "sind": CEquation.OP.SIND,
        "cosd": CEquation.OP.COSD,
        "tand": CEquation.OP.TAND,
        "sign": CEquation.OP.SIGN,
        "abs": CEquation.OP.ABS,
        "exp": CEquation.OP.EXP,
        "log": CEquation.OP.LOG,
        "cos": CEquation.OP.COS,
        "sin": CEquation.OP.SIN,
        "tan": CEquation.OP.TAN,
        "not": CEquation.OP.NOT,
        "max": CEquation.OP.NARG_MAX,
        "min": CEquation.OP.NARG_MIN,
        "mod": CEquation.OP.NARG_MOD,
        "rem": CEquation.OP.NARG_REM,
        "||": CEquation.OP.OR,
        "!=": CEquation.OP.NEQ,
        "==": CEquation.OP.EQ,
        "&&": CEquation.OP.AND,
        "<=": CEquation.OP.LTE,
        ">=": CEquation.OP.GTE,
        "if": CEquation.OP.NARG_IF,
        "!": CEquation.OP.NOT,
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
     * Units.
     */

    CEquation.SIUnits = {
        "dimensionless": [0, 0, 0, 0, 0, 0, 0, 1.0, 0],
        //          kg      m      A      s      K     mol    cd    scale offset
        //---SI Base Units---------------------------
        "kg":   [  1.0,     0,     0,     0,     0,     0,     0,    1.0,     0], //  0 EQSI_KG  = mass
        "m":    [    0,   1.0,     0,     0,     0,     0,     0,    1.0,     0], //  1 EQSI_M   = length
        "A":    [    0,     0,   1.0,     0,     0,     0,     0,    1.0,     0], //  2 EQSI_A   = electric current
        "s":    [    0,     0,     0,   1.0,     0,     0,     0,    1.0,     0], //  3 EQSI_S   = time
        "K":    [    0,     0,     0,     0,   1.0,     0,     0,    1.0,     0], //  4 EQSI_K   = therm. temperature
        "mol":  [    0,     0,     0,     0,     0,   1.0,     0,    1.0,     0], //  5 EQSI_MOL = amount of substance
        "cd":   [    0,     0,     0,     0,     0,     0,   1.0,    1.0,     0], //  6 EQSI_CD  = lum. intensity
        //---SI Derived Units------------------------
        "W":    [  1.0,   2.0,     0,  -3.0,     0,     0,     0,    1.0,     0], //  7 W  = J/s
        "J":    [  1.0,   2.0,     0,  -2.0,     0,     0,     0,    1.0,     0], //  8 J  = N m
        "Pa":   [  1.0,  -1.0,     0,  -2.0,     0,     0,     0,    1.0,     0], //  9 Pa = N/m2
        "N":    [  1.0,   1.0,     0,  -2.0,     0,     0,     0,    1.0,     0], // 10 N  = kg m /s2
        "Hz":   [    0,     0,     0,  -1.0,     0,     0,     0,    1.0,     0], // 11 Hz = 1/s
        "C":    [    0,     0,   1.0,   1.0,     0,     0,     0,    1.0,     0], // 12 C  = A s
        "V":    [  1.0,   2.0,  -1.0,  -3.0,     0,     0,     0,    1.0,     0], // 13 V  = W/A
        "F":    [ -1.0,  -2.0,   2.0,   4.0,     0,     0,     0,    1.0,     0], // 14 F  = C/V
        "ohm":  [  1.0,   2.0,  -2.0,  -3.0,     0,     0,     0,    1.0,     0], // 15 Ohm= V/A
        //---Allowed INPUT units only----------------
        "g":    [  1.0,     0,     0,     0,     0,     0,     0,    1.0e-3,  0], // 16 g -> kg
        "L":    [    0,   3.0,     0,     0,     0,     0,     0,    1.0e-3,  0], // 17 L -> m3
        "degC": [    0,     0,     0,     0,   1.0,     0,     0,    1.0,273.15], // 18 degC -> K
        "degF": [    0,     0,     0, 0, 1.0, 0, 0, 5.0/9.0,273.15-5.0/9.0*32.0], // 19 degF -> K
        "mi":   [    0,   1.0,     0,     0,     0,     0,     0, 1609.344,   0], // 20 mi -> m
        "nmi":  [    0,   1.0,     0,     0,     0,     0,     0, 1852.0,     0], // 21 nmi -> m
        "yd":   [    0,   1.0,     0,     0,     0,     0,     0,    0.9144,  0], // 22 yd -> m
        "ft":   [    0,   1.0,     0,     0,     0,     0,     0,    0.3048,  0], // 23 ft -> m
        "in":   [    0,   1.0,     0,     0,     0,     0,     0,    2.54e-2, 0], // 24 in -> m
        "eV":   [  1.0,   2.0,     0,  -2.0,     0,     0,   0,1.60217646e-19,0], // 25 eV -> J
    };

    CEquation.SIUnitsRe = /^(|mol|cd|kg|m|a|s|K)/;
    CEquation.SIDerivedUnitsRe = /^(ohm|Pa|Hz|W|J|N|C|V|F)/;
    CEquation.SIInputUnitsRe = /^(degC|degF|mol|nmi|ohm|Hz|Pa|cd|eV|ft|in|kg|mi|yd|A|C|F|J|K|L|N|V|W|g|m|s)/;

    //---Prefixes---
    CEquation.SIPrefix = {
        "Y": 1e24,
        "Z": 1e21,
        "E": 1e18,
        "P": 1e15,
        "T": 1e12,
        "G": 1e9,
        "M": 1e6,
        "k": 1e3,
        "h": 1e2,
        "d": 1e-1,
        "c": 1e-2,
        "m": 1e-3,
        "u": 1e-6,
        "n": 1e-9,
        "p": 1e-12,
        "f": 1e-15,
        "a": 1e-18,
        "z": 1e-21
    };
    CEquation.SIPrefixRe = /^(Y|Z|E|P|T|G|M|k|h|d|c|m|u|n|p|f|a|z)/;
    
    //---Dimensioned Constants-------------------
    CEquation.SIConstUnits = {
        "e0":   [ -1.0,  -3.0,   2.0,   4.0,     0,     0,     0,    1.0,     0], //  1 e0  = F/m
        "c":    [    0,   1.0,     0,  -1.0,     0,     0,     0,    1.0,     0], //  0 c   = m/s
        "mu0":  [  1.0,   1.0,  -2.0,  -2.0,     0,     0,     0,    1.0,     0], //  2 mu0 = N/A2
        "G":    [ -1.0,   3.0,     0,  -2.0,     0,     0,     0,    1.0,     0], //  3 G   = m3/ kg s2
        "h":    [  1.0,   2.0,     0,  -1.0,     0,     0,     0,    1.0,     0], //  4 h   = J s
        "N_A":  [    0,     0,     0,     0,     0,  -1.0,     0,    1.0,     0], //  5 N_A = 1/mol
        "kB":   [  1.0,   2.0,     0,  -2.0,  -1.0,     0,     0,    1.0,     0], //  6 kB  = J/K
        "R":    [  1.0,   2.0,     0,  -2.0,  -1.0,  -1.0,     0,    1.0,     0], //  7 R   = J/K mol
        "e":    [    0,     0,   1.0,   1.0,     0,     0,     0,    1.0,     0], // e  = C        ,
     };
     
    /**
     * Constants.
     */
    CEquation.SIConst = {
        "pi": { value: M_PI, units: CEquation.SIUnits.dimensionless, description: "Ratio of circumference of circle to its diameter." },
        "c": { value: 299792458, units: CEquation.SIConstUnits.c, description: "Speed of light in vacuum." },
        "Z0": { value: 376.730313461, units: CEquation.SIUnits.ohm, description: "Impedance of free space."},
        "e0": { value: 8.854187817e-12, units: CEquation.SIConstUnits.e0, description: "Permittivity of a vacuum." },
        "mu0": { value: 4e-7 * M_PI, units: CEquation.SIConstUnits.mu0, description: "Permeability of a vacuum." },
        "G": { value: 6.67428e-11, units: CEquation.SIConstUnits.G, description: "Gravitational constant." },
        "h": { value: 6.62606896e-34, units: CEquation.SIConstUnits.h, description: "Planck's constant." },
        "hbar": { value: 6.62606896e-34 / (2.00 * M_PI), units: CEquation.SIConstUnits.h, description: "Reduced Planck's constant." },
        "e": { value: 1.602176487e-19, units: CEquation.SIConstUnits.e, description: "Electrical charge of an electron." },
        "m_alpha": { value: 6.64465620e-27, units: CEquation.SIUnits.kg, description: "Mass of alpha particle." },
        "m_e": { value: 9.10938215e-31, units: CEquation.SIUnits.kg, description: "Mass of electron." },
        "m_n": { value: 1.674927211e-27, units: CEquation.SIUnits.kg, description: "Mass of neutron." },
        "m_p": { value: 1.672621637e-27, units: CEquation.SIUnits.kg, description: "Mass of proton." },
        "m_u": { value: 1.660538782e-27, units: CEquation.SIUnits.kg, description: "Atomic mass constant." },
        "N_A": { value: 6.02214179e23, units: CEquation.SIUnits.dimensionless, description: "Avogadro's constant." },
        "kB": { value: 1.3806504e-23, units: CEquation.SIUnits.dimensionless, description: "Boltzmann's constant." },
        "R": { value: 8.314472, units: CEquation.SIConstUnits.R, description: "Molar mass constant." },
     };
     
     CEquation.SIConstRe =
        /^(m_alpha|hbar|m_e|m_n|m_p|m_u|N_A|mu0|pi|kB|Z0|e0|c|G|h|e|R)/;
     
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
        UNKNOWN_BINARY_OP: "UNKNOWN_BINARY_OP",   // Unknown binary operator
        UNKNOWN_UNARY_OP: "UNKNOWN_UNARY_OP",     // Unknown unary operator
        // UNKNOWNNARGOP: "UNKNOWNNARGOP",    // Unkown n-arg operator
        UNKNOWN_TOKEN_TYPE: "UNKNOWN_TOKEN_TYPE", // Unknown Valop type
        STACK_NOT_EMPTY: "STACK_NOT_EMPTY",       // Stack not empty at end of equation
        STACK_UNDERFLOW: "STACK_UNDERFLOW",       // Stack hasn't enough entries
        // CONTAINSVAR: "CONTAINSVAR",    // contains variables than are not supplied
        BAD_TOKEN: "BAD_TOKEN",                   // not right type of token
        // ASSIGNNOTALLOWED: "ASSIGNNOTALLOWED",    // not allowed to change variables
        UNIT_MISMATCH: "UNIT_MISMATCH",           // mismatched units
        UNIT_NOT_DIMLESS: "UNIT_NOT_DIMLESS",     // unit on expected dimensionless arg
        // NOEQUATION: "NOEQUATION",    // there is no equation to evaluate
    };
}(CEquation));

