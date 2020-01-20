var CEquation = function (txtEqn, txtAns, divStack, txtVarNames, txtVarValues) {
    /**********************************************************
    * CLCEqn.js
    * Javascript version of the CLCEqtn class.
    *
    * $PSchlup 2004-2020 $     $Revision 8 $
    * Revision History
    *       2020jan08   Convert to HTML/JavaScript.
    *    8  2009may25   Converting to Javascript. For now,
    *                   we're not including units, 'cos they
    *                   didn't quite work out.
    *    7  2008mar29   Adding units and dimensions
    *    6  2008mar22S  Added n-argument operators and assignment (!)
    *    5  2006nov18S  Added logical operators
    *  4.3  2006oct19   Added ContainsVariable(k)
    *  4.2  2004nov     -SetVariableNames, +ParseDoubleEquation
    *  4.1  2004nov     Added primitive units support (then removed it again)
    *  4.0  2004oct     Adapted for LaserCanvas
    *  1.0  2004aug     Initial development
    **********************************************************/

    /**********************************************************
    * Constants
    **********************************************************/
    const SZVERSION = "CEquation v8";           // equation version string
    const NULL = 0;
    const M_PI = 3.141592653589793;
    const M_PI_180 = 0.01745329251994;
    const M_180_PI = 57.29577951308232;

    //---Characters---------------------------------
    // ILLEGALCHAR: Characters not ever allowed in the string
    const EQ_ILLEGALCHAR = "`~@$%[]{}?\;:"

    // VALIDCHAR: Valid first characters of variable name
    const EQ_VALIDCHAR = "abcdefghijklmnopqrstuvwxyz_ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    // VALIDSYMB: Valid variable name symbols
    const EQ_VALIDSYMB = "abcdefghijklmnopqrstuvwxyz_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'\""

    //===Operators============================================
    ///TODO: Logical && || vs. UINT & |!
    const OP_NULL = 0x0000;
    const OP_POP = 1;          // remove (comma in non-multi situations)

    const OP_BINARYMIN = 2;          // first searchable binary operator
    //                              | - equal
    const OP_PSH = 2;          // comma (Push) binary op
    const OP_SET = 3;          // set (variable = expression)
    const OP_OR = 4;          // or ||
    const OP_AND = 5;          // and &&

    const OP_RELOPMIN = 6;          // start of relational operators
    const OP_LTE = 6;          // less or equal <=
    const OP_GTE = 7;          // greater or equal >=
    const OP_LT = 8;          // less than <
    const OP_GT = 9;          // greater than >
    const OP_NEQ = 10;          // not equal !=
    const OP_EQ = 11;          // equal ==
    const OP_RELOPMAX = 11;          // end of relation operators

    const OP_ADD = 12;          // ascending in precedence order
    const OP_SUB = 13;
    const OP_MUL = 14;
    const OP_DIV = 15;
    const OP_POW = 16;
    //                              | - equal
    const OP_BINARYMAX = 16;          // last real binary operator

    const OP_UNARY = 20;          // unary ops have OP_UNARY added
    const OP_ABS = 0;
    const OP_SQRT = 1;
    const OP_EXP = 2;
    const OP_LOG = 3;
    const OP_LOG10 = 4;
    const OP_CEIL = 5;
    const OP_FLOOR = 6;
    const OP_COS = 7;
    const OP_SIN = 8;
    const OP_TAN = 9;
    const OP_ACOS = 10;
    const OP_ASIN = 11;
    const OP_ATAN = 12;
    const OP_COSH = 13;
    const OP_SINH = 14;
    const OP_TANH = 15;
    const OP_SIND = 16;
    const OP_COSD = 17;
    const OP_TAND = 18;
    const OP_ASIND = 19;
    const OP_ACOSD = 20;
    const OP_ATAND = 21;
    const OP_NOT = 22;          // not !
    const OP_SIGN = 23;
    const OP_ROUND = 24;
    const NUM_UNARYOP = 25;          // number of defined unary ops

    const OP_NARG = 50;          // n-arg ops have OP_NARG added
    const OP_NARG_MOD = 0;
    const OP_NARG_REM = 1;
    const OP_NARG_ATAN2 = 2;
    const OP_NARG_ATAN2D = 3;
    const OP_NARG_MAX = 4;
    const OP_NARG_MIN = 5;
    const OP_NARG_IF = 6;
    const NUM_NARGOP = 7;          // number of define n-arg ops

    const OP_BRACKETOFFSET = 100;          // added for each nested bracket

    //---Character strings--------------------------
    // Each operator / constant is terminated by a single NULL character. The loops
    // count up to NUM_UNARYOP and NUM_CONSTANT, so ensure these values are correct

    const CEquationBinaryOpStr =
        [",", "=",                               // assignment
            "||", "&&", "<=", ">=", "<", ">", "!=", "==", // relational
            "+", "-", "*", "/", "^"];             // standard binary

    const CEquationUnaryOpStr =
        ["abs", "sqrt", "exp", "log", "log10", "ceil", "floor", "cos", "sin", "tan",
            "acos", "asin", "atan", "cosh", "sinh", "tanh", "sind", "cosd", "tand", "asind",
            "acosd", "atand", "!", "sign", "round"];

    const CEquationNArgOpStr =           // n-arg operator strings
        ["mod", "rem", "atan2", "atan2d", "max", "min", "if"];
    const CEquationNArgOpArgc =          // n-arg operator argument counts (-ve: min arg count)
        [2, 2, 2, 2, -2, -2, 3];

    function OP2STR(o) {
        return (
            (o == OP_PSH) ? "Push" :
            (o == OP_POP) ? "Pop" :
            (o == OP_SET) ? "Assign" :
            (o == OP_ADD) ? "+" :
            (o == OP_SUB) ? "-" :
            (o == OP_DIV) ? "/" :
            (o == OP_MUL) ? "*" :
            (o == OP_POW) ? "^" :
            (o == OP_OR) ? "Or" :
            (o == OP_AND) ? "And" :
            (o == OP_LTE) ? "<=" :
            (o == OP_GTE) ? ">=" :
            (o == OP_LT) ? "<" :
            (o == OP_GT) ? ">" :
            (o == OP_NEQ) ? "!=" :
            (o == OP_EQ) ? "==" :
            (o - OP_UNARY) == OP_ABS ? "Abs" :
            (o - OP_UNARY) == OP_SQRT ? "Sqrt" :
            (o - OP_UNARY) == OP_EXP ? "Exp" :
            (o - OP_UNARY) == OP_LOG10 ? "Log10" :
            (o - OP_UNARY) == OP_LOG ? "Log" :
            (o - OP_UNARY) == OP_CEIL ? "Ceil" :
            (o - OP_UNARY) == OP_FLOOR ? "Floor" :
            (o - OP_UNARY) == OP_COS ? "Cos" :
            (o - OP_UNARY) == OP_SIN ? "Sin" :
            (o - OP_UNARY) == OP_TAN ? "Tan" :
            (o - OP_UNARY) == OP_ACOS ? "ACos" :
            (o - OP_UNARY) == OP_ASIN ? "ASin" :
            (o - OP_UNARY) == OP_ATAN ? "ATan" :
            (o - OP_UNARY) == OP_COSH ? "Cosh" :
            (o - OP_UNARY) == OP_SINH ? "Sinh" :
            (o - OP_UNARY) == OP_TANH ? "Tanh" :
            (o - OP_UNARY) == OP_SIND ? "SinD" :
            (o - OP_UNARY) == OP_COSD ? "CosD" :
            (o - OP_UNARY) == OP_TAND ? "TanD" :
            (o - OP_UNARY) == OP_ASIND ? "ASinD" :
            (o - OP_UNARY) == OP_ACOSD ? "ACosD" :
            (o - OP_UNARY) == OP_ATAND ? "ATanD" :
            (o - OP_UNARY) == OP_NOT ? "Not" :
            (o - OP_UNARY) == OP_SIGN ? "Sign" :
            (o - OP_UNARY) == OP_ROUND ? "Round" :
            (o - OP_NARG) == OP_NARG_MOD ? "Mod" :
            (o - OP_NARG) == OP_NARG_REM ? "Rem" :
            (o - OP_NARG) == OP_NARG_ATAN2 ? "Atan2" :
            (o - OP_NARG) == OP_NARG_ATAN2D ? "Atan2D" :
            (o - OP_NARG) == OP_NARG_MAX ? "Max" :
            (o - OP_NARG) == OP_NARG_MIN ? "Min" :
            (o - OP_NARG) == OP_NARG_IF ? "If" :
            "*unknown*");
    }

    //===Units and Dimensions=================================
    // VALIDUNIT: Valid characters in units (including prefixes)
    const EQ_VALIDUNIT = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // The dimensioned constants store an INDEX into the same
    // array as used for the named constants. The ordering is
    //  - Base units first; followed by
    //  - Named units; followed by
    //  - Units used in dimensioned constants
    // Why? Because when VOTYP_UNIT  is evaluated, it expects
    // a single value that is the index into the units list.
    const EQSI_NUMDIM_SCL = 9;                  // number of base unit dimensions plus scale factor coefficients

    const EQSI_NUMUNIT_BASE = 7;                // number of SI base units
    const EQSI_NUMUNIT = 16;                    // total number named units for output (base plus derived)
    const EQSI_NUMUNIT_INPUT = 26;              // number of units for input

    const EQSI_NUMUNIT_CONST = 8;               // number of units for dimensioned constants

    // typedef struct tagUNITBASE {                // this needs to be a STRUCT for TEqStack
    // double d[EQSI_NUMUNIT_BASE];
    // } UNITBASE;

    const CEquationSIUnit = [
        // kg      m      A      s      K     mol    cd    scale offset
        // Values EARLIER in the table take precedence
        //---SI Base Units---------------------------
        [  1.0,     0,     0,     0,     0,     0,     0,    1.0,     0], //  0 EQSI_KG  = mass
        [    0,   1.0,     0,     0,     0,     0,     0,    1.0,     0], //  1 EQSI_M   = length
        [    0,     0,   1.0,     0,     0,     0,     0,    1.0,     0], //  2 EQSI_A   = electric current
        [    0,     0,     0,   1.0,     0,     0,     0,    1.0,     0], //  3 EQSI_S   = time
        [    0,     0,     0,     0,   1.0,     0,     0,    1.0,     0], //  4 EQSI_K   = therm. temperature
        [    0,     0,     0,     0,     0,   1.0,     0,    1.0,     0], //  5 EQSI_MOL = amount of substance
        [    0,     0,     0,     0,     0,     0,   1.0,    1.0,     0], //  6 EQSI_CD  = lum. intensity
        //---SI Derived Units------------------------
        [  1.0,   2.0,     0,  -3.0,     0,     0,     0,    1.0,     0], //  7 W  = J/s
        [  1.0,   2.0,     0,  -2.0,     0,     0,     0,    1.0,     0], //  8 J  = N m
        [  1.0,  -1.0,     0,  -2.0,     0,     0,     0,    1.0,     0], //  9 Pa = N/m2
        [  1.0,   1.0,     0,  -2.0,     0,     0,     0,    1.0,     0], // 10 N  = kg m /s2
        [    0,     0,     0,  -1.0,     0,     0,     0,    1.0,     0], // 11 Hz = 1/s
        [    0,     0,   1.0,   1.0,     0,     0,     0,    1.0,     0], // 12 C  = A s
        [  1.0,   2.0,  -1.0,  -3.0,     0,     0,     0,    1.0,     0], // 13 V  = W/A
        [ -1.0,  -2.0,   2.0,   4.0,     0,     0,     0,    1.0,     0], // 14 F  = C/V
        [  1.0,   2.0,  -2.0,  -3.0,     0,     0,     0,    1.0,     0], // 15 Ohm= V/A
        //---Allowed INPUT units only----------------
        [  1.0,     0,     0,     0,     0,     0,     0,    1.0e-3,  0], // 16 g -> kg
        [    0,   3.0,     0,     0,     0,     0,     0,    1.0e-3,  0], // 17 L -> m3
        [    0,     0,     0,     0,   1.0,     0,     0,    1.0,273.15], // 18 degC -> K
        [    0,     0,     0, 0, 1.0, 0, 0, 5.0/9.0,273.15-5.0/9.0*32.0], // 19 degF -> K
        [    0,   1.0,     0,     0,     0,     0,     0, 1609.344,   0], // 20 mi -> m
        [    0,   1.0,     0,     0,     0,     0,     0, 1852.0,     0], // 21 nmi -> m
        [    0,   1.0,     0,     0,     0,     0,     0,    0.9144,  0], // 22 yd -> m
        [    0,   1.0,     0,     0,     0,     0,     0,    0.3048,  0], // 23 ft -> m
        [    0,   1.0,     0,     0,     0,     0,     0,    2.54e-2, 0], // 24 in -> m
        [  1.0,   2.0,     0,  -2.0,     0,     0,   0,1.60217646e-19,0], // 25 eV -> J


        //---Dimensioned Constants-------------------
        // Offset by NUMUNIT_INPUT
        [    0,   1.0,     0,  -1.0,     0,     0,     0,    1.0,     0], //  0 c   = m/s
        [ -1.0,  -3.0,   2.0,   4.0,     0,     0,     0,    1.0,     0], //  1 e0  = F/m
        [  1.0,   1.0,  -2.0,  -2.0,     0,     0,     0,    1.0,     0], //  2 mu0 = N/A2
        [ -1.0,   3.0,     0,  -2.0,     0,     0,     0,    1.0,     0], //  3 G   = m3/ kg s2
        [  1.0,   2.0,     0,  -1.0,     0,     0,     0,    1.0,     0], //  4 h   = J s
        [    0,     0,     0,     0,     0,  -1.0,     0,    1.0,     0], //  5 N_A = 1/mol
        [  1.0,   2.0,     0,  -2.0,  -1.0,     0,     0,    1.0,     0], //  6 kB  = J/K
        [  1.0,   2.0,     0,  -2.0,  -1.0,  -1.0,     0,    1.0,     0]  //  7 R   = J/K mol
    ];

    const CEquationSIUnitStr = [
        // Base units . . . . . . | Derived units . . .          | Constants . .
        "kg", "m", "A", "s", "K", "mol", "cd", "W", "J", "Pa", "N", "Hz", "C", "V", "F", "Ohm",
        "g", "L", "degC", "degF", "mi", "nmi", "yd", "ft", "in", "eV", // input only units
        "m/s", "F/m", "N/A2", "m3/kg s2", "J s", "/mol", "J/K", "J/K mol", // constants
    ];

    //---Prefixes-----------------------------------
    const EQSI_NUMUNIT_PREFIX = 11;            // number of recognized prefixes
    const EQSI_NUMUNIT_PREFIX_OUTPUT = 10;     // number of prefixes used in output

    const CEquationSIUnitPrefix =
        [1e12, 1e9, 1e6, 1e3, 100, 0.01, 1e-3, 1e-6, 1e-9, 1e-12, 1e-15];
    const CEquationSIUnitPrefixStr = "TGMkhcmunpf";

    // Used for auto-adjustment, disabled for now
    //const double CEquationSIUnitPrefixOutput[EQSI_NUMUNIT_PREFIX_OUTPUT] =
    //   {1e12,1e9,1e6,1e3,1,1e-3,1e-6,1e-9,1e-12,1e-15};
    //const char CEquationSIUnitPrefixOutputStr[] = "TGMk*munpf";

    //===Dimensioned Constants================================
    const EQSI_NUMCONST = 17;                  // number of dimensioned constants
    const CEquationSIConstUnitIndx = [
                             -1,                  // pi = []
        EQSI_NUMUNIT_INPUT +  0,                  // c = m/s
                             15,                  // Z0 = Ohm
        EQSI_NUMUNIT_INPUT +  1,                  // e0 = F/m
        EQSI_NUMUNIT_INPUT +  2,                  // mu0 = N/A2
        EQSI_NUMUNIT_INPUT +  3,                  // G = m3/kg s2
        EQSI_NUMUNIT_INPUT +  4,                  // h = Js
        EQSI_NUMUNIT_INPUT +  4,                  // hbar = Js
                             12,                  // e = C
                              0,                  // m_alpha = kg
                              0,                  // m_e = kg
                              0,                  // m_n = kg
                              0,                  // m_p = kg
                              0,                  // m_u = kg (atomic mass constant)
        EQSI_NUMUNIT_INPUT +  5,                  // N_A = 1/mol Avogadro's
        EQSI_NUMUNIT_INPUT +  6,                  // kB = J/K Boltzmann's
        EQSI_NUMUNIT_INPUT +  7,                  // R = J / K mol
    ];

    //---Constants----------------------------------
    const CEquationSIConst = [
        M_PI,                // pi
        299792458,           // c
        376.730313461,       // Z0
        8.854187817e-12,     // e0
        4e-7 * M_PI,           // mu0
        6.67428e-11,         // G
        6.62606896e-34,      // h
        6.62606896e-34 / (2.00 * M_PI), // hbar = h/2pi
        1.602176487e-19,     // e
        6.64465620e-27,      // m_alpha
        9.10938215e-31,      // m_e
        1.674927211e-27,     // m_n
        1.672621637e-27,     // m_p
        1.660538782e-27,     // m_u
        6.02214179e23,       // N_A
        1.3806504e-23,       // kB
        8.314472,            // R
    ];

    const CEquationSIConstStr = [
        "pi",
        "c",
        "Z0",
        "e0",
        "mu0",
        "G",
        "h",
        "hbar",
        "e",
        "m_alpha",
        "m_e",
        "m_n",
        "m_p",
        "m_u",
        "N_A",
        "kB",
        "R",
    ];

    //===Errors===============================================
    const EQERR_NONE = 0;    // no error

    const EQERR_PARSE_ALLOCFAIL = -1;    // could not allocate memory
    const EQERR_PARSE_NOEQUATION = -2;    // there's no equation

    const EQERR_PARSE_NUMBEREXPECTED = 1;    // looking for number, (, -sign, or unary op
    const EQERR_PARSE_UNKNOWNFUNCVAR = 2;
    const EQERR_PARSE_BRACKETEXPECTED = 3;    // expecting ( (after unary operator)
    const EQERR_PARSE_BINARYOPEXPECTED = 4;    // expecting +-*/^ operator
    const EQERR_PARSE_BRACKETSOPEN = 5;    // not enough closing brackets
    const EQERR_PARSE_UNOPENEDBRACKET = 6;    // not enough opening brackets
    const EQERR_PARSE_NOADVANCE = 7;    // current token failed to advance iThisScan
    const EQERR_PARSE_CONTAINSVAR = 8;    // contains vars when not permitted
    const EQERR_PARSE_NARGBADCOUNT = 9;    // wrong number of arguments to function
    const EQERR_PARSE_STACKOVERFLOW = 10;    // stack overflow, too many ops
    const EQERR_PARSE_ASSIGNNOTVAR = 11;    // assignment needs variable
    const EQERR_PARSE_ASSIGNNOTALLOWED = 12;    // assignment not allowed
    const EQERR_PARSE_UNITEXPECTED = 13;    // expected unit after "in" keyword
    const EQERR_PARSE_UNITALREADYDEF = 14;    // target unit already defined
    const EQERR_PARSE_UNITINCOMPATIBLE = 15;    // incompatible unit
    const EQERR_PARSE_ILLEGALCHAR = 99;    // illegal character

    const EQERR_EVAL_UNKNOWNBINARYOP = 101;    // Unknown binary operator
    const EQERR_EVAL_UNKNOWNUNARYOP = 102;    // Unknown unary operator
    const EQERR_EVAL_UNKNOWNNARGOP = 103;    // Unkown n-arg operator
    const EQERR_EVAL_UNKNOWNVALOP = 104;    // Unknown Valop type
    const EQERR_EVAL_STACKNOTEMPTY = 105;    // Stack not empty at end of equation
    const EQERR_EVAL_STACKUNDERFLOW = 106;    // Stack hasn't enough entries
    const EQERR_EVAL_CONTAINSVAR = 108;    // contains variables than are not supplied
    const EQERR_EVAL_BADTOKEN = 109;    // not right type of token
    const EQERR_EVAL_ASSIGNNOTALLOWED = 110;    // not allowed to change variables
    const EQERR_EVAL_UNITMISMATCH = 111;    // mismatched units
    const EQERR_EVAL_UNITNOTDIMLESS = 112;    // unit on expected dimensionless arg
    const EQERR_EVAL_NOEQUATION = 199;    // there is no equation to evaluate

    const EQERR_MATH_DIV_ZERO = 201;    // division by zero
    const EQERR_MATH_DOMAIN = 202;    // domain error (acos, etc) (sometimes cplx)
    const EQERR_MATH_SQRT_NEG = 203;    // square root of negative (--> cplx)
    const EQERR_MATH_LOG_ZERO = 204;    // log of zero - always undefined
    const EQERR_MATH_LOG_NEG = 205;    // log of negative (--> cplx)
    const EQERR_MATH_OVERFLOW = 206;    // exp(large number) overflow

    //---Parse status-------------------------------
    const LOOKFOR_NUMBER = 0x01;             // number, unary op, parentheses, negative, constant
    const LOOKFOR_BINARYOP = 0x02;             // binary op only
    const LOOKFOR_BRACKET = 0x03;             // brackets only (after unary op)

    //===Operator stack typedef===============================
    //---Valop types--------------------------------
    const VOTYP_UNDEFINED = 0x00;          // undefined
    const VOTYP_VAL = 0x01;          // valop is numeric value
    const VOTYP_OP = 0x02;          // valop is built-in operator or function
    const VOTYP_REF = 0x03;          // valop is index into variable array
    const VOTYP_UNIT = 0x04;          // unit: immediate multiply by value (not used?)
    const VOTYP_NARGC = 0x05;          // n-argument count whenever bracket is closed
    const VOTYP_PREFIX = 0x06;          // same effect as TYP_VAL (not used?)

    /*********************************************************
    *  ErrorString
    *  Returns a description of the error code.
    *********************************************************/
    function ErrorString(iError) {
        return (
            (iError == EQERR_NONE) ? "No error" :

            (iError == EQERR_PARSE_ALLOCFAIL) ? "Could not allocate buffer" :
            (iError == EQERR_PARSE_NOEQUATION) ? "Equation not defined" :

            (iError == EQERR_PARSE_NUMBEREXPECTED) ? "Number, function, or variable expected" :
            (iError == EQERR_PARSE_UNKNOWNFUNCVAR) ? "Unknown function or variable" :
            (iError == EQERR_PARSE_BRACKETEXPECTED) ? "Bracket -(- expected" :
            (iError == EQERR_PARSE_BINARYOPEXPECTED) ? "Binary operator expected" :
            (iError == EQERR_PARSE_UNOPENEDBRACKET) ? "Too many -)- brackets" :
            (iError == EQERR_PARSE_BRACKETSOPEN) ? "Missing -)- brackets(s)" :
            (iError == EQERR_PARSE_NOADVANCE) ? "No advance at token" :
            (iError == EQERR_PARSE_CONTAINSVAR) ? "Constant expression expected" :
            (iError == EQERR_PARSE_NARGBADCOUNT) ? "Function has wrong number of arguments" :
            (iError == EQERR_PARSE_STACKOVERFLOW) ? "Parse stack overflow" :
            (iError == EQERR_PARSE_ASSIGNNOTVAR) ? "Assignment must be to valid variable" :
            (iError == EQERR_PARSE_ASSIGNNOTALLOWED) ? "Assignment not allowed" :
            (iError == EQERR_PARSE_UNITEXPECTED) ? "Unit expected" :
            (iError == EQERR_PARSE_UNITALREADYDEF) ? "Result unit already defined" :
            (iError == EQERR_PARSE_UNITINCOMPATIBLE) ? "Incompatible unit" :
            (iError == EQERR_PARSE_ILLEGALCHAR) ? "Illegal character" :

            (iError == EQERR_EVAL_UNKNOWNBINARYOP) ? "Unknown binary operator" :
            (iError == EQERR_EVAL_UNKNOWNUNARYOP) ? "Unknown unary operator" :
            (iError == EQERR_EVAL_UNKNOWNNARGOP) ? "Unknown n-argument operator" :
            (iError == EQERR_EVAL_UNKNOWNVALOP) ? "Corrupted command - unknown valop" :
            (iError == EQERR_EVAL_STACKNOTEMPTY) ? "Corrupted value stack - not empty" :
            (iError == EQERR_EVAL_STACKUNDERFLOW) ? "Value stack underflow" :
            (iError == EQERR_EVAL_CONTAINSVAR) ? "Variable(s) not supplied" :
            (iError == EQERR_EVAL_BADTOKEN) ? "Unexpected token type" :
            (iError == EQERR_EVAL_ASSIGNNOTALLOWED) ? "Assignment not allowed" :
            (iError == EQERR_EVAL_UNITMISMATCH) ? "Incompatible units" :
            (iError == EQERR_EVAL_UNITNOTDIMLESS) ? "Dimensionless argument expected" :
            (iError == EQERR_EVAL_NOEQUATION) ? "No equation to evaluate" :

            (iError == EQERR_MATH_DIV_ZERO) ? "Division by zero" :
            (iError == EQERR_MATH_DOMAIN) ? "Domain error" :
            (iError == EQERR_MATH_SQRT_NEG) ? "Square root of negative number" :
            (iError == EQERR_MATH_LOG_ZERO) ? "Log of zero" :
            (iError == EQERR_MATH_LOG_NEG) ? "Log of negative number" :
            (iError == EQERR_MATH_OVERFLOW) ? "Overflow" :
            "Unknown error");
    }

    /*#########################################################
    ## Equation Class
    ## The following code is derived from the CEquation class.
    #########################################################*/
    var iError;                                 // error code
    var iErrorLocation;                         // source string error location
    var pvoEquation;                            // operator, value, location stack { uTyp, iPos, dVal, uOp, iRef, iUnit, iArgc }
    var szEquation;                             // equation source string

    var isPos;                                  // stack of operator positions (parse only)
    var isOps;                                  // stack of pending operations (parse only)

    var m_szUnit = "";                         // char   formatted string before output
    var m_uUnitTarget = {};                    // UNITBASE target unit base (array of doubles for each EQSI_NUMUNIT_BASE)
    var m_dScleTarget = 0.00;                  // double   target scaling
    var m_dOffsTarget = 0.00;                  // double   target offset
 
    /**********************************************************
    * Update
    **********************************************************/
    function Update() {
        const NUMVAR = txtVarNames.length;
        const c_szVar = txtVarNames.map(function (txt) { return txt.value; });
        const ddVar = txtVarValues.map(function (txt) { return +txt.value; });

        var k;                                    // loop counter
        var iErr;                                 // parsing error

        //---Read Equation----------------------------
        var szEqn = txtEqn.value;
        // for(k=0; k<NUMVAR; k++) {
        //    ddVar[k] = parseFloat(document.getElementById("txtVar" + k).value);
        //    if(isNaN(ddVar[k])) ddVar[k] = 0;
        // }

        ParseEquation(szEqn, c_szVar);      // parse equation with variable names from HTML sheet
        if (iError != EQERR_NONE) return;

        //---Set Answer-------------------------------
        ShowEquationStack();
        var tfAllowDerived = true;
        DoEquation(ddVar, tfAllowDerived);
    }



    /**********************************************************
    * ShowEquationStack
    * For debug purposes, it's worth having this be relatively
    * elaborate
    **********************************************************/
    function ShowEquationStack() {
        var iOp, k, kMin;                        // loop counters
        var sz, szRow;                           // string
        sz = "<PRE>" + szEquation + "<BR>";
        for (iOp = 0; iOp < pvoEquation.length; iOp++) { // each operator as row
            szRow = "";
            for (k = 0; k < pvoEquation[iOp].iPos; k++) szRow += " "; // leading spaces
            szRow += "|";
            switch (pvoEquation[iOp].uTyp) {
                case VOTYP_UNDEFINED: szRow += "!Undefined Valop"; break;
                case VOTYP_VAL: szRow += "Value=" + pvoEquation[iOp].dVal; break;
                case VOTYP_OP: szRow += "Operator:" + OP2STR(pvoEquation[iOp].uOp); break;
                case VOTYP_REF: szRow += "Variable[" + pvoEquation[iOp].iRef + "]"; break;
                case VOTYP_NARGC: szRow += "nArgC=" + pvoEquation[iOp].iArgc; break;
                default: szRow += "??Valop=" + pvoEquation[iOp].uTyp;
            }
            sz += szRow + "<BR>";
        }
        sz += "</PRE>"
        divStack.innerHTML = sz;
    }

    /*********************************************************
    *  ContainsUnits
    *  Returns TRUE if the equation contains at least one
    *  unit. Retruns FALSE if no units are included, or if
    *  no equation is defined
    *  Sets iErrorPosition to point to where the found unit
    *  occurs in the source equation
    * NOTE - Units are not fully implemented in Rev. 4.1!
    *********************************************************/
    function ContainsUnits() {
        var iThisPt;                             // loop counter
    
        if (iEqnLength <= 0) return false;         // no equation defined
        for (iThisPt = 0; iThisPt < iEqnLength; iThisPt += 1) {
            if (pvoEquation[iThisPt].uTyp == VOTYP_UNIT) { // found a unit
                iErrorLocation = pvoEquation[iThisPt].iPos; // point to position
                return true;
            }
        }
        return false;
    }

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
   function _ParseEquationUnits(_szEqtn, iThisPt, iBrktOff, uLookFor) {
        var iThisScan;                         // int   advance this scan location
        var pszSt;                             // char *offset into character arrays
        var iTokLen;                           // int   token length
        var iPrfx;                             // int   prefix index
        var iUnit;                             // int   loop counter
        var iThisOp;                           // int   unit multiplier
        // var voThisValop;                       // VALOP value/operator to push onto stack
        var ipszSt = 0;                        // Loop over CEquationSIUnitStr
        iThisScan =  0;                          // found no unit yet
        iPrfx     = -1;                          // no prefix yet
    
        //---Get token length------------------------
        for (iTokLen=1; (iThisPt + iTokLen < strlen(_szEqtn)) && strchr(EQ_VALIDUNIT, _szEqtn[iThisPt + iTokLen]); iTokLen += 1);
        if (iTokLen <= 0) return 0;                // ignore bad token
    
        //---Scan for Unit---------------------------
        do {                                     // search twice: once with and then without prefix
            pszSt = CEquationSIUnitStr[ipszSt];      // start at beginning of string
            for(iUnit = 0; iUnit < EQSI_NUMUNIT_INPUT; iUnit += 1) {
                if( strncmp(_szEqtn.substring(iThisPt), pszSt, Math.max(pszSt.length, iTokLen)) == 0 ) {
                    //---hanging---
                    if(uLookFor == LOOKFOR_NUMBER) {
                        iThisOp = isOps.Peek(); while(iThisOp > OP_BRACKETOFFSET) iThisOp -= OP_BRACKETOFFSET;
                        switch(iThisOp) {
                            case OP_DIV:                 // hanging / --> add "1"
                                pvoEquation.push({
                                    uTyp: VOTYP_PREFIX, // scale factor
                                    dVal: 1.00,
                                    iPos: iThisPt
                                });
                                iBrktOff += OP_BRACKETOFFSET; // higher precedence
                                break;
                            case OP_MUL:                 // after "*" not needed
                                isOps.pop();              // remove the multiplication
                                isPos.pop();
                            break;
                            default:                     // everything else is an error
                                iError = EQERR_PARSE_NUMBEREXPECTED;
                                return 0;
                        }
                    } else {
                        iThisOp = iBrktOff + OP_BRACKETOFFSET; // do everthing higher than me
                        _ProcessOps(iThisOp, iBrktOff);
                    }
        
                    //---prefix---
                    if (iPrfx >= 0) {
                        if (iError != EQERR_NONE) return 0;
                        pvoEquation.push({
                            uTyp: VOTYP_PREFIX, // scale factor
                            dVal: CEquationSIUnitPrefix[iPrfx],
                            iPos: iThisPt
                        });
                        isOps.push(OP_MUL + iBrktOff);
                        isPos.push(iThisPt);
                    }
        
                    //---unit---
                    iThisOp = isOps[iOps.length - 1]; while (iThisOp > OP_BRACKETOFFSET) iThisOp -= OP_BRACKETOFFSET;
                    // TODO: v-- is this line correct?
                    iThisOp = OP_MUL + iBrktOff + (iThisOp == OP_DIV ? 1 : 0) * OP_BRACKETOFFSET;
                    pvoEquation.push({
                        uTyp: VOTYP_UNIT,
                        iUnit: iUnit,
                        iPos: iThisPt       // store const's position
                    });
                    _ProcessOps(iThisOp, iBrktOff);
                    iThisScan = pszSt.length + ((iPrfx >= 0) ? 1 : 0); // length of this scan
                    iPrfx = -9999;                     // stop searching prefixes
                    break;                             // stop looking
                }
                ipszSt += 1;           // advance to next part in string
            }
            if (iPrfx <= -9999) break;
        
            //---Scan for prefix-------------------------
            for (iPrfx = 0; iPrfx < EQSI_NUMUNIT_PREFIX; iPrfx += 1)
                if (CEquationSIUnitPrefixStr[iPrfx] == _szEqtn[iThisPt]) break;
            if (iPrfx >= EQSI_NUMUNIT_PREFIX) break; // skip if not found
            iThisPt++;                            // start back up one
            iTokLen--;                            // string is one char longer
        } while(1);
        return iThisScan;
    }    
    /*********************************************************
    * Parse equation
    * Return value is an error code
    *********************************************************/
    function ParseEquation(_szEqtn, pszVars) {
        var uLookFor;                         // parse status, next token
        var iThisPt;                          // index into source string
        var iThisScan;                        // advance in this scan
        var dThisVal;                         // numeric value
        var iTokLen;                          // length of this token (ops, variables)
        var iThisOp;                          // current binary operator
        var iPrevOp;                          // previous binary op on stack
        var iUnOp;                            // unary operator / loop counter
        var iNArgOp;                          // n-arg operator / loop counter
        var iCnst;                            // constant / loop counter
        var iVrbl;                            // variable / loop counter
        var cChar;                            // char buffer for binary op
        var iBrktOff;                         // bracket offset
        var voThisValop;                      // operator for stack

        var szErrMsg;                            // error message in answer box

        //===Prepare New Equation==============================
        pvoEquation = [];                     // Operator stack.
        isPos = new Array();                // stack of operator positions
        isOps = new Array();                // stack of pending operations
        szEquation = _szEqtn;                    // store equation string for evaluation

        //===Parse Equation====================================
        iThisPt = 0;                            // scan from start of buffer
        iBrktOff = 0;                            // no bracket offset
        iError = EQERR_NONE;                   // no error
        uLookFor = LOOKFOR_NUMBER;               // start by looking for a number

        while ((iThisPt < _szEqtn.length) && (iError == EQERR_NONE)) {
            while (_szEqtn[iThisPt] == ' ') iThisPt++; // skip blank chars
            if (iThisPt >= _szEqtn.length) break;  // end of equation reached
            if (strchr(EQ_ILLEGALCHAR, _szEqtn[iThisPt]) != NULL) {
                iError = EQERR_PARSE_ILLEGALCHAR;
                break;
            }
            iThisScan = 0;                        // scan length of this step

            switch (uLookFor) {
                //----------------------------------------
                //   Number
                //----------------------------------------
                case LOOKFOR_NUMBER:
                    //---Function, constant, or variable---
                    if (strchr(EQ_VALIDCHAR, _szEqtn[iThisPt]) != NULL) {
                        //---tokenize---
                        iTokLen = 1;
                        while ((iThisPt + iTokLen < strlen(_szEqtn))
                            && (strchr(EQ_VALIDSYMB, _szEqtn[iThisPt + iTokLen]) != NULL)) {
                            iTokLen++;
                        }
                        //---variables---
                        // scan first to allow overloading
                        // NOTE - does not remove lead/trail spaces!
                        if (pszVars.length > 0) {
                            iVrbl = 0;                   // start counting up variables
                            while (iVrbl < pszVars.length) { // stop at end of list
                                if (_szEqtn.substr(iThisPt, iTokLen) == pszVars[iVrbl]) {
                                    pvoEquation.push({
                                        uTyp: VOTYP_REF,
                                        iRef: iVrbl,
                                        iPos: iThisPt
                                    });
                                    iThisScan = iTokLen;   // length of this scan
                                    uLookFor = LOOKFOR_BINARYOP; // look for binary operator next
                                    break;
                                }
                                iVrbl++;                    // advance to next variable
                            }
                            if (uLookFor == LOOKFOR_BINARYOP) break;// break out if already found variable
                        }

                        //---constant---
                        for (iCnst = 0; iCnst < CEquationSIConst.length; iCnst++) {
                            if (_szEqtn.substr(iThisPt, iTokLen) == CEquationSIConstStr[iCnst]) {
                                pvoEquation.push({
                                    uTyp: VOTYP_VAL,
                                    dVal: CEquationSIConst[iCnst],
                                    iPos: iThisPt  // store const's position
                                });
                                if (CEquationSIConstUnitIndx[iCnst] >= 0) {
                                    pvoEquation.push({
                                        uTyp: VOTYP_UNIT,
                                        iUnit: CEquationSIConstUnitIndx[iCnst],
                                        iPos: iThisPt // store unit multiplier
                                    });
                                }
                                iThisScan = iTokLen;       // length of this scan
                                uLookFor = LOOKFOR_BINARYOP; // look for binary operator next
                                break;                       // stop looking
                            }
                        }
                        if (iCnst < CEquationSIConst.length) break; // break out if already found constant

                        //---unary---
                        // Scan for unary operators using CEquationUnaryOpStr
                        for (iUnOp = 0; iUnOp < NUM_UNARYOP; iUnOp++) {
                            if (_szEqtn.substr(iThisPt, iTokLen) == CEquationUnaryOpStr[iUnOp]) {
                                isPos.push(iThisPt);         // store the operator's position
                                isOps.push(OP_UNARY + iUnOp + iBrktOff); // save this op
                                iThisScan = iTokLen;         // length of this token
                                uLookFor = LOOKFOR_BRACKET;  // look for opening bracket next
                                break;
                            }
                        }
                        if (iUnOp < NUM_UNARYOP) break;  // break out if already found op

                        //---n-arg---
                        for (iNArgOp = 0; iNArgOp < NUM_NARGOP; iNArgOp++) {
                            if (_szEqtn.substr(iThisPt, iTokLen) == CEquationNArgOpStr[iNArgOp]) {
                                isPos.push(iThisPt);      // store this position
                                isOps.push(OP_NARG + iNArgOp + iBrktOff); // save this op
                                iThisScan = iTokLen;      // length of this token
                                uLookFor = LOOKFOR_BRACKET; // look for opening bracket
                                break;
                            }
                        }
                        if (iNArgOp < NUM_NARGOP) break; // break out if found n-arg op

                        //---hanging unit---
                        iThisScan = _ParseEquationUnits(_szEqtn, iThisPt, iBrktOff, isOps, isPos, uLookFor);
                        if (iThisScan > 0) { uLookFor = LOOKFOR_BINARYOP; break; }

                        iError = EQERR_PARSE_UNKNOWNFUNCVAR;

                        //---Negative sign---
                        // For sho':  -2^2 = -4 according to Matlab, so - sign must be
                        // processed before scanning for a number here
                    } else if (_szEqtn[iThisPt] == '-') {
                        pvoEquation.push({
                            uTyp: VOTYP_VAL,
                            dVal: -1.0000,
                            iPos: iThisPt
                        });
                        isOps.push(OP_MUL + iBrktOff);
                        isPos.push(iThisPt);
                        iThisScan = 1;                  // size of this token
                        uLookFor = LOOKFOR_NUMBER;     // look for number again

                        //---Positive sign---
                    } else if (_szEqtn[iThisPt] == '+') {
                        // nop
                        iThisScan = 1;
                        uLookFor = LOOKFOR_NUMBER;     // look for number again

                        //---Bracket---
                    } else if (_szEqtn[iThisPt] == '(') {
                        iBrktOff += OP_BRACKETOFFSET;   // increment nested brackets
                        iThisScan = 1;                  // size of this token
                        uLookFor = LOOKFOR_NUMBER;     // look for number again

                        //---Number---
                        // we don't have a good sscanf, so use our own scanFloat
                    } else {
                        dThisVal = scanFloat(_szEqtn, iThisPt); // returns [val, len]
                        iThisScan = dThisVal[1];           // length from scanFloat
                        dThisVal = dThisVal[0];           // value from scanFloat
                        if (iThisScan > 0) {
                            pvoEquation.push({
                                uTyp: VOTYP_VAL,     // store value
                                dVal: dThisVal,      // value from scanFloat
                                iPos: iThisPt       // current position
                            });
                            uLookFor = LOOKFOR_BINARYOP;    // look for binary operator next
                        } else {
                            iError = EQERR_PARSE_NUMBEREXPECTED;
                        }
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
                // In JavaScript, because we want to auto-search the
                // list of binary operators, we have to do the -)-
                // bracket in an IF first.
                case LOOKFOR_BINARYOP:
                    //---Closing bracket---
                    // In order  to allow multi-argument  operators, we
                    // need to record the number of  arguments at parse
                    // time---the RPN stack has no knowledge of bracket
                    // levels when the equation is evaluated.
                    if (_szEqtn[iThisPt] == ')') {
                        iCnst = iVrbl = 0;              // iCnst=loop counter, iVrbl counts OP_PSH
                        do {
                            iCnst--;
                            if ((isOps.length + iCnst) < 0) break; // exit when done with array
                            iNArgOp = isOps[isOps.length + iCnst];
                            if (iNArgOp <= iBrktOff) break;
                            if ((iNArgOp - iBrktOff) == OP_PSH) iVrbl++; // count OP_PSH instances
                            while (iNArgOp > OP_BRACKETOFFSET) iNArgOp -= OP_BRACKETOFFSET;
                            if ((iNArgOp >= OP_NARG) && (iNArgOp < OP_NARG + NUM_NARGOP)
                                && (CEquationNArgOpArgc[iNArgOp - OP_NARG] < 0)) iCnst--; // skip vari-arg count
                            if (iNArgOp == OP_SET) iCnst--; // skip assignment variable reference
                        } while (1);

                        iBrktOff -= OP_BRACKETOFFSET;   // go up one bracket level
                        if (iBrktOff < 0) iError = EQERR_PARSE_UNOPENEDBRACKET;
                        else iThisScan = 1;             // size of this token
                        uLookFor = LOOKFOR_BINARYOP;   // continue looking for binary op

                        iNArgOp -= iBrktOff + OP_NARG;  // offset to n-arg operators
                        iVrbl += 1;                   // there's one more argument that PUSHes
                        if ((iNArgOp >= 0) && (iNArgOp < NUM_NARGOP)) { // n-arg operators
                            if ((iVrbl < Math.abs(CEquationNArgOpArgc[iNArgOp]))
                                || ((CEquationNArgOpArgc[iNArgOp] > 0) && (iVrbl > CEquationNArgOpArgc[iNArgOp]))) {
                                iThisPt = isPos[isOps.length - iCnst] - 1;
                                iError = EQERR_PARSE_NARGBADCOUNT; // wrong number of args
                                break;
                            }
                            if (CEquationNArgOpArgc[iNArgOp] < 0) {
                                isOps.splice(iCnst, 0, iVrbl); // iCnst is negative.
                                isPos.splice(iCnst, 0, isPos[isPos.length - iCnst]);
                                ////                  isOps.InsertBack(iVrbl, iCnst);
                                ////                  isPos.InsertBack(isPos.PeekBack(iCnst), iCnst);
                            }
                        } else {                        // single-arg op
                            if (iVrbl > 1) {
                                iThisPt = isPos[isPos.length - iCnst] - 1;
                                iError = EQERR_PARSE_NARGBADCOUNT;
                                break;
                            }
                        }
                        break;                          // done, next token
                    }//endif -)- bracket

                    //---Built-in operators----------------
                    for (iThisOp = OP_BINARYMIN; iThisOp <= OP_BINARYMAX; iThisOp++) {
                        iThisScan = CEquationBinaryOpStr[iThisOp - OP_BINARYMIN].length; // length of this operator
                        if (iThisPt + iThisScan > _szEqtn.length) continue;
                        if (_szEqtn.substr(iThisPt, iThisScan) != CEquationBinaryOpStr[iThisOp - OP_BINARYMIN]) continue;

                        // found an operator, continue with it...
                        //---Assignment---------------------
                        if (iThisOp == OP_SET) {
                            ///TODO:Assignment flag               if(!AssignEnabled()) { iError = EQERR_PARSE_ASSIGNNOTALLOWED; break; };
                            if ((pvoEquation.length <= 0) || (pvoEquation[pvoEquation.length - 1].uTyp != VOTYP_REF)) {
                                iError = EQERR_PARSE_ASSIGNNOTVAR;
                                iThisPt--;
                                break;
                            }
                            voThisValop = pvoEquation.pop();  // remove variable OP_REF from stack
                            isOps.push(voThisValop.iRef);     // store reference as "operator"
                            isPos.push(voThisValop.iPos);     // source string location
                        }

                        //---Push / Pops--------------------
                        // Commas, when not used  in conjunction with
                        // multi-argument operators, remove the first
                        // argument and retain the second.
                        if (iThisOp == OP_PSH) {
                            if (iBrktOff <= 0) iThisOp = OP_POP;
                            iCnst = 0;                   // look back to find if multi-arg
                            do {
                                iCnst--;
                                if (isOps.length + iCnst < 0) break;
                                iNArgOp = isOps[isOps.length + iCnst];
                                if (iNArgOp <= iBrktOff) break;
                                while (iNArgOp > OP_BRACKETOFFSET) iNArgOp -= OP_BRACKETOFFSET;
                                if ((iNArgOp >= OP_NARG) && (iNArgOp < OP_NARG + NUM_NARGOP)
                                    && (CEquationNArgOpArgc[iNArgOp - OP_NARG] < 0)) iCnst--; // skip vari-arg count
                                if (iNArgOp == OP_SET) iCnst--; // skip assignment variable reference
                            } while (1);
                            if ((iNArgOp - iBrktOff + OP_BRACKETOFFSET == 0)
                                || (iNArgOp < iBrktOff - OP_BRACKETOFFSET + OP_BINARYMIN))
                                iThisOp = OP_POP;
                        }

                        //---Process------------------------
                        iThisOp += iBrktOff;            // offset for brackets!!
                        iError = _ProcessOps(iThisOp, iBrktOff);

                        //---Push This Op-------------------
                        isOps.push(iThisOp);
                        isPos.push(iThisPt);
                        uLookFor = LOOKFOR_NUMBER;     // look for number again
                        break;
                    } // auto-search binary op for loop
                    
                    // if (iThisOp - iBrktOff > OP_BINARYMAX) iThisScan = 0; // catch non-binary operators
                    // break;

                    //---Units----------------
                    iThisScan = _ParseEquationUnits(_szEqtn, iThisPt, iBrktOff, uLookFor);
                    if (iThisScan > 0) { uLookFor = LOOKFOR_BINARYOP; break; }

                    //---Target unit----------
                    if (_szEqtn[iThisPt] == '#') {
                        iThisPt += 1;                   // skip past delimiter sign
                        var o = {}
                        iError = _StringToUnit(_szEqtn.substring(iThisPt), o);
                        m_szUnit = o.pszUnitOut;
                        m_uUnitTarget = o.pUnit;
                        m_dScleTarget = o.pdScale; // TODO: Only if truthy?
                        m_dOffsTarget = o.pdOffset; // TODO: Only if truthy?

                        if(iError != EQERR_NONE) iThisPt += iErrorLocation; // shift error into string
                        else iThisPt = strlen(_szEqtn); // this should be last on line
                        iThisScan = 1;
                    } else {
                        iError = EQERR_PARSE_BINARYOPEXPECTED;
                    }
                 break;
     
                //----------------------------------------
                //   Bracket -(-
                //----------------------------------------
                case LOOKFOR_BRACKET:
                    if (_szEqtn[iThisPt] == '(') {
                        iBrktOff += OP_BRACKETOFFSET;   // increment nested brackets
                        iThisScan = 1;                  // size of this token
                        uLookFor = LOOKFOR_NUMBER;     // look for number again
                    } else {
                        iError = EQERR_PARSE_BRACKETEXPECTED;
                    }
                    break;
                //........................................................
            }//switch
            if ((iThisScan == 0) && (iError == EQERR_NONE)) iError = EQERR_PARSE_NOADVANCE;
            iThisPt += iThisScan;                 // advance to start of next token
        }//while

        //===Error handling====================================
        //---Parse completion errors-----------------
        do {
            iErrorLocation = iThisPt;             // store where error occurred (if it did)
            if (iError != EQERR_NONE) break;       // retain first error
            if (iBrktOff > 0) { iError = EQERR_PARSE_BRACKETSOPEN; break; }
            if (uLookFor == LOOKFOR_BRACKET) { iError = EQERR_PARSE_BRACKETEXPECTED; break; }
            if (uLookFor == LOOKFOR_NUMBER) { iError = EQERR_PARSE_NUMBEREXPECTED; break; }

            //---Finish pushing operators-------------
            iThisOp = -1;                         // push all remaining operators
            iError = _ProcessOps(iThisOp, iBrktOff);

        } while (0);

        //---Error Location-------------------------- // js_new
        if (iError != EQERR_NONE) {
            szErrMsg = "";
            for (iThisPt = 0; iThisPt < iErrorLocation; iThisPt++) szErrMsg += " "; // leading spaces
            szErrMsg += "^ " + ErrorString(iError);
            txtAns.value = szErrMsg;
        }
        return (iError);
    }


    /*********************************************************
    * _StringToUnit                                   Private
    *********************************************************/
    // int CEquation::_StringToUnit(const char *_szEqtnOffset, char *pszUnitOut, int iLen, UNITBASE *pUnit, double *pdScale, double *pdOffset) {
    function _StringToUnit(_szEqtnOffset, o) { // keys of o were by-reference out variables in C++
        var pUnit = null;
        var pdScale = 1.00;
        var pdOffset = 0.00;
        var szUnitOut = "";                 // char     formatted local text
        var dScale, dOffset;                // double   local values
        var uUnit = { d: [] };              // UNITBASE local unit assembly
        var uUnitCur = { d: [] };           // UNITBASE current unit
        var dPwrCur;                        // double   current scaling power
        var dSclCur;                        // double   current scale factor
        var ipszEqtn;                       // char    *pointer into equation
        var psz;                            // char    *loop pointer into unit
        var dVal;                           // double   scanned value
        var iUnit;                          // int      unit loop counter
        var iBase;                          // int      base unit loop counter
        var iSign;                          // int      sign, top or bottom
        var iPrfx;                          // int      flag that unit is found
        var iTokLen;                        // int      token length
    
        //===Preliminaries=====================================
        for (iBase = 0; iBase < EQSI_NUMUNIT_BASE; iBase++) {
            uUnitCur.d[iBase] = uUnit.d[iBase] = 0.00; // clear unit arrays
        }
        iError   = EQERR_NONE;                   // default, no error
        iErrorLocation = 0;                      // just in case this becomes important
        dScale   = 1.00;                         // no scaling
        dOffset  = 0.00;                         // no offset
        iSign    = +1;                           // start on numerator
        dSclCur  = 1.00;                         // current scale factor
        dPwrCur  = 1.00;                         // current scaling power
        iUnit    = -1;                           // no unit to apply
        ipszEqtn = 0;                            // start at beginning of string
    
        if (strlen(_szEqtnOffset) <= 0) { iError = EQERR_PARSE_UNITEXPECTED; iErrorLocation = 0; return iError; }
        while (_szEqtnOffset[ipszEqtn] == ' ') ipszEqtn++;         // skip whitespace
        if (_szEqtnOffset[ipszEqtn] == '1') pszEqtn++;             // skip "1" in "1/" or "1mm"
    
        //===Scan Each Unit====================================
        do {
            //---Apply current------------------------
            if (iUnit >= 0) {
                for (iBase = 0; iBase < EQSI_NUMUNIT_BASE; iBase++) {
                    uUnit.d[iBase] += iSign * dPwrCur * uUnitCur.d[iBase]; // apply current unit
                    uUnitCur.d[iBase] = CEquationSIUnit[iUnit][iBase]; // new base unit scaling
                }
                if (iSign > 0) dScale *= Math.pow(dSclCur, dPwrCur); else dScale /= Math.pow(dSclCur, dPwrCur);
                dSclCur = dPwrCur = 1.00;
            }
        
            //---Skip whitespace----------------------
            while (_szEqtnOffset[ipszEqtn] == ' ') pszEqtn++;     // skip any whitespace
            if (_szEqtnOffset[ipszEqtn] == '\0') break;           // exit when at end of string
            if ((strlen(szUnitOut) > 0) && (szUnitOut[strlen(szUnitOut) - 1 ]!= '/'))
                szUnitOut += " "; // add space between units on output
        
            //---Solidus------------------------------
            if (_szEqtnOffset[ipszEqtn] == '/') {
                if (iSign < 1) { iError = EQERR_PARSE_ILLEGALCHAR; break; } // don't allow double-solidus
                szUnitOut += "/";                  // print solidus to output
                iUnit = -1;                        // don't apply unit next time
                iSign = -1; ipszEqtn++; continue;   // at first occurrence, switch to denominator
            }
        
            //---Unit---------------------------------
            iPrfx = -1;                           // haven't searched for prefix yet
            //// iTokLen=0; while(pszEqtn[iTokLen] && strchr(EQ_VALIDUNIT, pszEqtn[iTokLen])) iTokLen++;
            iTokLen=0; while(iTokLen < _szEqtnOffset.length - ipszEqtn && strchr(EQ_VALIDUNIT, _szEqtnOffset[ipszEqtn + iTokLen])) iTokLen++;
        
            do {
                ////for(psz=(char*)CEquationSIUnitStr, iUnit=0; iUnit<EQSI_NUMUNIT_INPUT; iUnit++, psz+=strlen(psz)+1) {
                for(iUnit=0; iUnit<EQSI_NUMUNIT_INPUT; iUnit++) {
                    psz = CEquationSIUnitStr[iUnit];
                    if (strncmp(_szEqtnOffset[ipszEqtn], psz, MAX(iTokLen, strlen(psz))) == 0) {
                        //---Scale and Offset---
                        if( ((CEquationSIUnit[iUnit][EQSI_NUMUNIT_BASE] != 1.00) && (dOffset != 0.00)) // don't allow offsets on pre-scaled
                            || ((CEquationSIUnit[iUnit][EQSI_NUMUNIT_BASE+1] != 0.00) && (dScale != 1.00)) // don't combine scales and offsets
                            || ((CEquationSIUnit[iUnit][EQSI_NUMUNIT_BASE+1] != 0.00) && (iSign < 0)) // don't allow offsets in denominator
                            ) {
                            iError = EQERR_PARSE_UNITINCOMPATIBLE; break;
                        }
                        for (iBase = 0; iBase < EQSI_NUMUNIT_BASE; iBase++) {
                            uUnitCur.d[iBase] = CEquationSIUnit[iUnit][iBase]; // new base unit scaling
                        }
                        dSclCur *= CEquationSIUnit[iUnit][EQSI_NUMUNIT_BASE];
                        dOffset += CEquationSIUnit[iUnit][EQSI_NUMUNIT_BASE+1];
        
                        //---Format---
                        //// sprintf(szUnitOut+strlen(szUnitOut), "%s", psz); // print this unit to output
                        szUnitOut += psz;            // print this unit to output
                        ipszEqtn += strlen(psz);
                        iPrfx = -999;                // indicate unit was found
                        break;
                    }//if(matched)
                }//for(unit)
                if ((iPrfx <= -999) || (iError!=EQERR_NONE)) break; // continue out of loop once unit found
                if ((iPrfx >= 0) || (iTokLen <= 1)) { iError = EQERR_PARSE_UNITEXPECTED; break; }
        
                //---Prefix----------------------------
                for (iPrfx = 0; iPrfx < EQSI_NUMUNIT_PREFIX; iPrfx++) {
                    if (_szEqtnOffset[ipszEqtn] == CEquationSIUnitPrefixStr[iPrfx]) {
                        dSclCur *= CEquationSIUnitPrefix[iPrfx];
                        szUnitOut += CEquationSIUnitPrefixStr[iPrfx];
                        ipszEqtn++; iTokLen--;
                        break;
                    }
                }
                if (iPrfx >= EQSI_NUMUNIT_PREFIX) { iError = EQERR_PARSE_UNITEXPECTED; break; }
                while (_szEqtnOffset[ipszEqtn] == ' ') ipszEqtn++;  // skip whitespace
            } while (iError == EQERR_NONE); // try again, with prefix second time
        
            //---Power--------------------------------
            while (_szEqtnOffset[ipszEqtn] == ' ') ipszEqtn++;     // skip whitespace
            ////if(sscanf(pszEqtn, "%lg", &dVal) > 0) {   // found a power
            var 
            dVal = scanFloat(_szEqtnOffset, ipszEqtn);
            if(dVal) {   // found a power
                if ((dVal < 0.00) && (iSign < 0)) { iError = EQERR_PARSE_UNITEXPECTED; break; } // don't allow kg/m-1
                if (dOffset != 0.00) { iError = EQERR_PARSE_UNITINCOMPATIBLE; break; } // don't allow degF^2
                dPwrCur = dVal;
                szUnitOut += dPwrCur;
                while ("-+0123456789".indexOf(_szEqtnOffset[ipszEqtn]) >= 0) ipszEqtn++; // skip number
            }
        } while(iError == EQERR_NONE);
    
        //---Check ending----------------------------
        if (szUnitOut[strlen(szUnitOut)-1] == '/') iError = EQERR_PARSE_UNITEXPECTED;
    
        //===Finalize==========================================
        if (iError != EQERR_NONE) iErrorLocation = pszEqtn - _szEqtnOffset; // distance into string
        //// if (pszUnitOut) strncpy(pszUnitOut, szUnitOut, iLen);
        //// if (pUnit) for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) pUnit->d[iBase] = uUnit.d[iBase];
        //// if (pdScale ) *pdScale  = dScale;
        //// if (pdOffset) *pdOffset = dOffset;
    
        // C++ filled out variables by reference.
        o.pszUnitOut = szUnitOut;
        o.pUnit = pUnit;
        o.pdScale = pdScale;
        o.pdOffset = pdOffset;

        return iError;
    }
 
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
    //int CEquation::_ProcessOps(TEqStack<VALOP> *pvosParsEqn, TEqStack<int> *pisOps, TEqStack<int> *pisPos, int iThisOp, int iBrktOff) {
    function _ProcessOps(iThisOp, iBrktOff) {
        var iPrevOp;                             // previous operator on stack

        do {
            if (isOps.length <= 0) break;          // exit when stack is empty
            iPrevOp = isOps[isOps.length - 1];      // examine previous operation
            //---Relational-------
            if (iPrevOp < iThisOp) {               // check lower-priority
                if ((iPrevOp < OP_RELOPMIN) || (iPrevOp > OP_RELOPMAX) // unless both relops, ..
                    || (iThisOp < OP_RELOPMIN) || (iThisOp > OP_RELOPMAX)) break; //..exit on lower precedence
            }
            if ((iThisOp == OP_PSH + iBrktOff) && (iPrevOp == iThisOp)) break; // retain multi argument push

            //---Previous op------
            iPrevOp = isOps.pop();                // get previous operation
            while (iPrevOp >= OP_BRACKETOFFSET) iPrevOp -= OP_BRACKETOFFSET; // strip bracket levels
            pvoEquation.push({
                uTyp: VOTYP_OP,            // operator type
                uOp: iPrevOp,             // operation
                iPos: isPos.pop()         // source string location
            });

            //---Set--------------
            if (iPrevOp == OP_SET) {
                pvoEquation.push({
                    uTyp: VOTYP_REF,         // variable reference comes next
                    iRef: isOps.pop(),       // variable ref earlier stored as "operator"
                    iPos: isPos.pop()       // source string location
                });
            }

            //---Variable-arg-----
            iPrevOp -= OP_NARG;                   // offset to check for multi-arg op
            if ((iPrevOp >= 0) && (iPrevOp < NUM_NARGOP) && CEquationNArgOpArgc[iPrevOp] < 0) {
                pvoEquation.push({
                    uTyp: VOTYP_NARGC,      // argument count type
                    iArgc: isOps.pop(),      // arg count was earlier stored as "operator"
                    iPos: isPos.pop()      // source string location
                });
            }
        } while (1);                              // repeat until finished
        return (EQERR_NONE);
    }


    /**********************************************************
    * C/C++ string functions
    * We should check that there aren't built-in versions
    **********************************************************/
    //===strchr================================================
    function strchr(szString, cChar) {
        var k;
        for (k = 0; k < szString.length; k++) if (szString[k] == cChar) return (k + 1);
        return (NULL);
    }

    //===strncmp===============================================
    function strncmp(str1, str2, num) {
        const s1 = str1.substring(0, num),
            s2 = str2.substring(0, num);
        return s1 === s2 ? 0 : s1 > s2 ? 1 : -1;
    }

    //===strlen================================================
    function strlen(szString) { return (szString.length); }

    //===scanFloat=============================================
    function scanFloat(sz, iOffs) {
        var iLen = 0;                              // number length
        var iDec = 0;                              // decimal point
        var iExp = 0;                              // 0:mantissa 1:exponent sign 2:exponent number 3:exp ok
        for (iLen = iOffs; iLen < sz.length; iLen++) {
            if ((sz[iLen] >= '0') && (sz[iLen] <= '9')) { // 0-9 ok
                if (iExp > 0) iExp = 3;                 // exponent number now
            } else if ((sz[iLen] == '.') && (iDec == 0) && (iExp == 0)) {
                iDec++;                           // one '.' ok in mantissa
            } else if (((sz[iLen] == 'e') || (sz[iLen] == 'E')) && (iExp == 0)) {
                iExp = 1;                         // exponent prefix
            } else if (((sz[iLen] == '+') || (sz[iLen] == '-')) && (iExp == 1)) {
                iExp = 2;                         // exponent sign
            } else break;                         // others - fail
        }
        if (iExp < 3) iLen -= iExp;                 // fix hanging exponent
        return ([parseFloat(sz.substr(iOffs, iLen)), iLen - iOffs]);
    }

    /** Returns the sign of the number [-1, 0, 1]. */
    function SIGN (val) {
        return val > 0 ? +1 : val < 0 ? -1 : 0;
    }

    /*********************************************************
    *  DoEquation
    *  Perform calculation, using the variables given.
    * I'm stripping out all of the units processing here
    *********************************************************/
    function DoEquation(dVar, tfAllowDerived) {
        var dsVals = new Array();                // RPN stack of values
        var usUnits = new Array();               // RPN stack of unit factors
        var voThisValop;                         // token being processed
        var iThisPt;                             // pointer into equation
        var iArg;                                // multi-arg loop counter
        var uUnitZero;                           // zeros unit block for convenience
        var uUnit;                               // result unit
        var uUnit1;                              // argument 1 unit
        var uUnit2;                              // argument 2 unit
        var dVal;                                // result value
        var dArg1;                               // argument 1 value
        var dArg2;                               // argument 2 value
        var szErrMsg;                            // error message string

        if (pvoEquation.length <= 0) return (iError = EQERR_EVAL_NOEQUATION);
        uUnitZero = { d: [] };

        iError = EQERR_NONE;                     // no error
        for (iThisPt = 0; iThisPt < pvoEquation.length && iError == EQERR_NONE; iThisPt++) {
            voThisValop = pvoEquation[iThisPt];     // current operator

            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            // Simple Cases
            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            switch (voThisValop.uTyp) {
                //===Store a value==================================
                case VOTYP_VAL:
                case VOTYP_PREFIX:
                    dsVals.push(voThisValop.dVal); usUnits.push(uUnitZero);
                    break;

                //===Variable=======================================
                case VOTYP_REF:
                    if ((voThisValop.iRef >= 0) && (voThisValop.iRef < dVar.length)) {
                        dsVals.push(dVar[voThisValop.iRef]); // save variable value
                        usUnits.push(uUnitZero);
                    } else {                           // need supplied variable values
                        dsVals.push(0.000);
                        usUnits.push(uUnitZero);
                        iError = EQERR_EVAL_CONTAINSVAR;
                    }
                    break;

                    //===Units==========================================
                    case VOPTYP_UNIT:
                        uUnit = usUnits.pop();             // get last unit
                        for (iBase = 0; iBase < EQSI_NUMUNIT_BASE; iBase++)
                            uUnit.d[iBase] += CEquationSIUnit[voThisValop.iUnit][iBase];
                        usUnits.push(uUnit);               // push multiplied unit
                        dVal = dsVals.pop();
                        dVal = CEquationSIUnit[voThisValop.iUnit][EQSI_NUMUNIT_BASE + 1] // offset
                            + dVal * CEquationSIUnit[voThisValop.iUnit][EQSI_NUMUNIT_BASE]; // scale
                        dsVals.push(dVal);
                        break;

                //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                // Operators
                //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                case VOTYP_OP:
                    //===Assignment Operator=========================
                    if (voThisValop.uOp == OP_SET) {
                        ///TODO:Assign Flag            if((dVar==NULL) || (AssignEnabled()==FALSE)) { iError = EQERR_EVAL_ASSIGNNOTALLOWED; break; }
                        if (dsVals.length < 1) { iError = EQERR_EVAL_STACKUNDERFLOW; break; }
                        iThisPt++;                      // get variable reference from next
                        if (iThisPt >= pvoEquation.length) { iError = EQERR_EVAL_STACKUNDERFLOW; break; }
                        if (pvoEquation[iThisPt].uTyp != VOTYP_REF) { iError = EQERR_EVAL_BADTOKEN; break; }
                        dVar[pvoEquation[iThisPt].iRef] = dsVals[dsVals.length - 1]; // assign (leave in stack)
                        break;
                    }

                    //===Binary Operators============================
                    // These now also include unit checking.
                    if (voThisValop.uOp < OP_UNARY) {
                        if (dsVals.length < 2) iError = EQERR_EVAL_STACKUNDERFLOW;
                        dArg2 = dsVals.pop(); uUnit2 = usUnits.pop() // get second and..
                        dArg1 = dsVals.pop(); uUnit1 = usUnits.pop() //..first arguments of op

                        //---Check easy math errors---------
                        switch (voThisValop.uOp) {
                            case OP_DIV: if (dArg2 == 0) { dArg2 = 1.00; iError = EQERR_MATH_DIV_ZERO; } break;
                            case OP_POW:
                                if (dArg1 < 0.00) dArg2 = Math.floor(dArg2 + 0.50); // prevent fractions on negatives
                                if((dArg1 == 0.00) && (dArg2 < 0.00)) { dArg1 = 1.00; iError = EQERR_MATH_DIV_ZERO; }
                                break;
                        }
                 
                        //---Check Units--------------------
                        switch(voThisValop.uOp) {
                            case OP_ADD:  case OP_SUB:
                            case OP_OR:   case OP_AND:
                            case OP_LTE:  case OP_GTE:
                            case OP_LT:   case OP_GT :
                            case OP_NEQ:  case OP_EQ :
                                for(iBase = 0; (iBase < EQSI_NUMUNIT_BASE) && (uUnit1.d[iBase] == uUnit2.d[iBase]); iBase++);
                                if(iBase < EQSI_NUMUNIT_BASE) {
                                    iError = EQERR_EVAL_UNITMISMATCH; // mismatch triggers error
                                }
                                else switch (voThisValop.uOp) {
                                    case OP_ADD:  case OP_SUB:
                                        uUnit = uUnit2;
                                        break;
                                    case OP_OR:   case OP_AND:
                                    case OP_LTE:  case OP_GTE:
                                    case OP_LT:   case OP_GT :
                                    case OP_NEQ:  case OP_EQ :
                                        uUnit = uUnitZero;
                                        break;
                                }
                                break;
                            case OP_MUL: for (iBase = 0; iBase < EQSI_NUMUNIT_BASE; iBase++) uUnit.d[iBase] = uUnit1.d[iBase] + uUnit2.d[iBase]; break;
                            case OP_DIV: for (iBase = 0; iBase < EQSI_NUMUNIT_BASE; iBase++) uUnit.d[iBase] = uUnit1.d[iBase] - uUnit2.d[iBase]; break;
            
                            case OP_POW:
                                for (iBase = 0; (iBase < EQSI_NUMUNIT_BASE) && (uUnit2.d[iBase] == 0.00); iBase++)
                                    uUnit.d[iBase] = uUnit1.d[iBase] * dArg2; // argument factors up as power
                                if(iBase < EQSI_NUMUNIT_BASE) iError = EQERR_EVAL_UNITNOTDIMLESS;
                                break;
                        }

                        //---Perform Op---------------------
                        switch (voThisValop.uOp) {
                            case OP_PSH: dsVals.push(dArg1); usUnits.push(uUnit1); dVal = dArg2; uUnit = uUnit2; break; // restore both to stack
                            case OP_POP: dVal = dArg2; uUnit = uUnit2; break; // ignore first argument
                            case OP_ADD: dVal = dArg1 + dArg2; break;
                            case OP_SUB: dVal = dArg1 - dArg2; break;
                            case OP_MUL: dVal = dArg1 * dArg2; break;
                            case OP_DIV: dVal = dArg1 / dArg2; break;
                            case OP_POW: dVal = ((dArg1 == 0.00) && (dArg2 == 0.00)) ? 1.00 : Math.pow(dArg1, dArg2); break;
                            case OP_OR: dVal = ((dArg1 != 0.00) || (dArg2 != 0.00)) ? 1.00 : 0.00; break;
                            case OP_AND: dVal = ((dArg1 != 0.00) && (dArg2 != 0.00)) ? 1.00 : 0.00; break;
                            case OP_LTE: dVal = (dArg1 <= dArg2) ? 1.00 : 0.00; break;
                            case OP_GTE: dVal = (dArg1 >= dArg2) ? 1.00 : 0.00; break;
                            case OP_LT: dVal = (dArg1 < dArg2) ? 1.00 : 0.00; break;
                            case OP_GT: dVal = (dArg1 > dArg2) ? 1.00 : 0.00; break;
                            case OP_NEQ: dVal = (dArg1 != dArg2) ? 1.00 : 0.00; break;
                            case OP_EQ: dVal = (dArg1 == dArg2) ? 1.00 : 0.00; break;
                            default: iError = EQERR_EVAL_UNKNOWNBINARYOP;
                        }

                        //===Unary Operators=============================
                    } else if (voThisValop.uOp < OP_NARG) {
                        if (dsVals.length < 1) iError = EQERR_EVAL_STACKUNDERFLOW;
                        dArg1 = dsVals.pop(); uUnit = usUnits.pop(); // single function argument

                        switch (voThisValop.uOp - OP_UNARY) {
                            //---Primitive Limits Checking----------------
                            case OP_ACOS:
                            case OP_ACOSD:
                            case OP_ASIN:
                            case OP_ASIND:
                                if (Math.abs(dArg1) > 1.00) { dArg1 = 0.00; iError = EQERR_MATH_DOMAIN; } break;
                                break;
                            case OP_LOG10: if (dArg1 == 0.00) { dArg1 = 1.00; iError = EQERR_MATH_LOG_ZERO; }
                                if (dArg1 < 0.00) { dArg1 = 1.00; iError = EQERR_MATH_LOG_NEG; } break;
                            case OP_LOG: if (dArg1 == 0.00) { dArg1 = 1.00; iError = EQERR_MATH_LOG_ZERO; }
                                if (dArg1 < 0.00) { dArg1 = 1.00; iError = EQERR_MATH_LOG_NEG; } break;
                            case OP_SQRT: if (dArg1 < 0.00) { dArg1 = 0.00; iError = EQERR_MATH_SQRT_NEG; } break;
                            case OP_EXP: if (dArg1 > 709.00) { dArg1 = 0.00; iError = EQERR_MATH_OVERFLOW; } break;
                        }

                        //---Evaluate---------------------------------
                        switch (voThisValop.uOp - OP_UNARY) {
                            case OP_ABS: dVal = Math.abs(dArg1); break;
                            case OP_SQRT: dVal = Math.sqrt(dArg1); break;
                            case OP_EXP: dVal = Math.exp(dArg1); break;
                            case OP_LOG10: dVal = Math.log(dArg1) / Math.log(10.00); break;
                            case OP_LOG: dVal = Math.log(dArg1); break;
                            case OP_CEIL: dVal = Math.ceil(dArg1); break;
                            case OP_FLOOR: dVal = Math.floor(dArg1); break;
                            case OP_ROUND: dVal = Math.floor(dArg1 + 0.500); break;
                            case OP_COS: dVal = Math.cos(dArg1); break;
                            case OP_SIN: dVal = Math.sin(dArg1); break;
                            case OP_TAN: dVal = Math.tan(dArg1); break;
                            case OP_ACOS: dVal = Math.acos(dArg1); break;
                            case OP_ASIN: dVal = Math.asin(dArg1); break;
                            case OP_ATAN: dVal = Math.atan(dArg1); break;
                            // sweet ... no hyperbolics...
                            case OP_COSH: dVal = 0.5 * (Math.exp(dArg1) + Math.exp(-dArg1)); break;
                            case OP_SINH: dVal = 0.5 * (Math.exp(dArg1) - Math.exp(-dArg1)); break;
                            case OP_TANH: dVal = (Math.exp(2 * dArg1) - 1) / (Math.exp(2 * dArg1) + 1); break;
                            case OP_SIND: dVal = Math.sin(dArg1 * M_PI_180); break;
                            case OP_COSD: dVal = Math.cos(dArg1 * M_PI_180); break;
                            case OP_TAND: dVal = Math.tan(dArg1 * M_PI_180); break;
                            case OP_ASIND: dVal = M_180_PI * Math.asin(dArg1); break;
                            case OP_ACOSD: dVal = M_180_PI * Math.acos(dArg1); break;
                            case OP_ATAND: dVal = M_180_PI * Math.atan(dArg1); break;
                            case OP_NOT: dVal = (dArg1 == 0.00) ? 1.00 : 0.00; break;
                            case OP_SIGN: dVal = (dArg1 == 0.00) ? 0.00 : (dArg1 < 0.00) ? -1.00 : 1.00; break;
                            default: iError = EQERR_EVAL_UNKNOWNUNARYOP;
                        }

                        //===N-Argument Operators========================
                    } else {
                        if (dsVals.length < Math.abs(CEquationNArgOpArgc[voThisValop.uOp - OP_NARG])) iError = EQERR_EVAL_STACKUNDERFLOW;
                        //---2-Argument---------------------
                        if (CEquationNArgOpArgc[voThisValop.uOp - OP_NARG] == 2) {
                            dArg2 = dsVals.pop(); uUnit2 = usUnits.pop();
                            dArg1 = dsVals.pop(); uUnit1 = usUnits.pop();

                            switch (voThisValop.uOp - OP_NARG) {
                                case OP_NARG_MOD:            // see Matlab's definitions..
                                case OP_NARG_REM:            //..of MOD and REM!
                                    if (dArg2 == 0.00) {
                                        if ((voThisValop.uOp - OP_NARG) == OP_NARG_MOD) dVal = dArg1;
                                        else iError = EQERR_MATH_DIV_ZERO;
                                        break;
                                    }

                                    for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (uUnit1.d[iBase]==uUnit2.d[iBase]); iBase++); // units must match
                                    if(iBase<EQSI_NUMUNIT_BASE) iError = EQERR_EVAL_UNITMISMATCH; else uUnit = uUnit2; // answer has same units

                                    dVal = dArg1 - dArg2 * Math.floor(dArg1 / dArg2);
                                    if ((voThisValop.uOp - OP_NARG) == OP_NARG_REM) {
                                        //                     if(SIGN(dArg1) != SIGN(dArg2)) dVal -= dArg2;
                                        if (((dArg1 > 0.00) && (dArg2 < 0.00))
                                            || ((dArg1 < 0.00) && (dArg2 > 0.00))) dVal -= dArg2;
                                        ///TODO: Is that correct?!
                                    }
                                    break;

                                case OP_NARG_ATAN2:
                                case OP_NARG_ATAN2D:
                                    for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (uUnit1.d[iBase]==uUnit2.d[iBase]); iBase++); // units must match
                                    if(iBase<EQSI_NUMUNIT_BASE) iError = EQERR_EVAL_UNITMISMATCH; else uUnit = uUnitZero; // answer is dimensionless
                  
                                    dVal = (dArg2 == 0.00) ?
                                        ((dArg1 == 0.00) ? 0.00 : ((dArg1 > 0.00) ? M_PI / 2.00 : -M_PI / 2.00))
                                        : Math.atan2(dArg1, dArg2);
                                    if ((voThisValop.uOp - OP_NARG) == OP_NARG_ATAN2D) dVal *= M_180_PI;
                                    break;

                                default: iError = EQERR_EVAL_UNKNOWNNARGOP;
                            }
                            //---Variable-Argument--------------
                        } else if (CEquationNArgOpArgc[voThisValop.uOp - OP_NARG] < 0) {
                            iThisPt++;
                            if (iThisPt >= pvoEquation.length) { iError = EQERR_EVAL_STACKUNDERFLOW; break; }
                            if (pvoEquation[iThisPt].uTyp != VOTYP_NARGC) { iError = EQERR_EVAL_UNKNOWNNARGOP; break; }
                            switch (voThisValop.uOp - OP_NARG) {
                                case OP_NARG_MAX:
                                case OP_NARG_MIN:
                                    dVal = dsVals.pop(); uUnit = usUnits.pop();
                                    for (iArg = 1; iArg < pvoEquation[iThisPt].iArgc; iArg++) {
                                        dArg1 = dsVals.pop(); uUnit1 = usUnits.pop();

                                        for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (uUnit1.d[iBase]==uUnit.d[iBase]); iBase++);
                                        if(iBase<EQSI_NUMUNIT_BASE) iError = EQERR_EVAL_UNITMISMATCH; // units must match
                   
                                        switch (voThisValop.uOp - OP_NARG) {
                                            case OP_NARG_MAX: if (dArg1 > dVal) dVal = dArg1; break;
                                            case OP_NARG_MIN: if (dArg1 < dVal) dVal = dArg1; break;
                                        }
                                    }
                                    break;

                                default: iError = EQERR_EVAL_UNKNOWNNARGOP;
                            }
                            //---Remaining N-Argument-----------
                        } else {
                            switch (voThisValop.uOp - OP_NARG) {
                                case OP_NARG_IF:
                                    dArg2 = dsVals.pop(); uUnit2 = usUnits.pop(); // value-if-false
                                    dArg1 = dsVals.pop(); uUnit1 = usUnits.pop(); // value-if-true
                                    dVal = dsVals.pop(); uUnit = usUnits.pop(); // conditional test
                                    for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (uUnit.d[iBase]==0.00); iBase++); // units must match
                                    if(iBase<EQSI_NUMUNIT_BASE) iError = EQERR_EVAL_UNITNOTDIMLESS;
                                    uUnit = (dVal==0.00) ? uUnit2 : uUnit1;
                                    dVal = (dVal == 0.00) ? dArg2 : dArg1;
                                    break;
                                default: iError = EQERR_EVAL_UNKNOWNNARGOP;
                            }
                        }
                    }//if
                    dsVals.push(dVal); usUnits.push(uUnit); // store operation result on stack
                    break;

                //---Fall-through error-------------------
                default:
                    iError = EQERR_EVAL_UNKNOWNVALOP;
                    break;
            }//switch
        }//for

        //===Error handling====================================
        if ((iError == EQERR_NONE) && (dsVals.length > 1)) iError = EQERR_EVAL_STACKNOTEMPTY;
        if (iError != EQERR_NONE) {
            iErrorLocation = (iThisPt - 1 < pvoEquation.length) ? // store where processing failed..
                pvoEquation[iThisPt - 1].iPos : 0;

            szErrMsg = "";
            for (iThisPt = 0; iThisPt < iErrorLocation; iThisPt++) szErrMsg += " "; // leading spaces
            szErrMsg += "| " + ErrorString(iError);
            txtAns.value = szErrMsg;
            return (iError);                       //..and return with error
        }

        //===Final Answer======================================
        dVal = dsVals.pop(); uUnit = usUnits.pop(); // last value is answer
    //---Unit Specified------
    if(m_dScleTarget != 0.00) {              // dScle gets set to at least 1.0 on custom
        //---dimensions check---
        for (iBase = 0; iBase < EQSI_NUMUNIT_BASE && m_uUnitTarget.d[iBase] == uUnit.d[iBase]; iBase++);
        if(iBase < EQSI_NUMUNIT_BASE) {       // dimensions check
    //printf("\nResult:"); for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) printf(" %lg ", uUnit.d[iBase]);
    //printf("\nTarget:"); for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) printf(" %lg ", m_uUnitTarget.d[iBase]);
            iErrorLocation = strlen(pszSrcEquation);
            return (iError = EQERR_EVAL_UNITMISMATCH);
        }
        //---apply---
        dVal = (dVal - m_dOffsTarget) / m_dScleTarget;

    //---Not spec'd-------
    } else {
        var out = {
            pdVal: dVal,
            puUnit: uUnit
        };
        _AnswerUnitString(out, tfAllowDerived);   // convert answer with units
        dVal = out.pdVal;
        uUnit = out.puUnit;
    }

        txtAns.value = dVal;

        //---Return----------------------------------
        return (iError = EQERR_NONE);               // return OK flag
    }

    /*********************************************************
    * AnswerUnitString                                Private
    * If pdVal is supplied, searches for prefixes that make
    * the value better and replaces the value there.
    * This APPENDS to the string already in m_szUnit to al-
    * llow target unit processing
    *********************************************************/
    function _AnswerUnitString(out, tfAllowDerived) {
        var ddUnit = new Array(EQSI_NUMUNIT_BASE); // double scaled powers for matched unit
        var iUnit;                            // int    matching unit loop counter
        var iMaxUnit;                         // int    end point for matching unit
        var iBase;                            // int    base unit loop counter
        var k;                                // int    loop counter
        var iNum;                             // int    number of units used
        var dVal;                             // double temporary value
        var dPwr;                             // double total absolute power
        var dScl;                             // double power scale factor
        var iNumUnitMin;                      // int    number of units for best-formatted case
        var indxUnitMin;                      // int    starting matched unit index for best formatting
        var dPwrUnitMin;                      // double smallest powers raised
        var dSclUnitMin;                      // double power factor for best formatted
        var ipsz, psz;                        // char  *pointer into units string
    
        //---Preliminaries---------------------------
        for(iNum = iBase = 0; iBase < EQSI_NUMUNIT_BASE; iBase++) {
            ddUnit[iBase] = out.puUnit.d[iBase];  // copy from input
            if(ddUnit[iBase] != 0.00) iNum++;     // count units used
        }
    
        //===Prefix / Scaling==================================
    /*   //---Scaling---------------------------------
        if((pdVal) && (iNum>0)) {
    ///TODO: Also, use the unit scale factor entries here!
    
        //---Prefix-------------------------------
        // We want the one where the remaining prefactor is
        // closest to but in excess  of 1. Since the prefix
        // values are sorted  largest to smallest, we  stop
        // at the first one where this condition is met.
        dScl = ABS(*pdVal);                   // absolute value of
        for(iUnit=0; iUnit<EQSI_NUMUNIT_PREFIX_OUTPUT; iUnit++) if(dScl >= CEquationSIUnitPrefixOutput[iUnit]) break;
        if((iUnit < EQSI_NUMUNIT_PREFIX_OUTPUT) && (CEquationSIUnitPrefixOutput[iUnit] != 1.00)) {
            *pdVal /= CEquationSIUnitPrefixOutput[iUnit];
            sprintf(m_szUnit+strlen(m_szUnit), "%c", CEquationSIUnitPrefixOutputStr[iUnit]);
        }
        }//if(pdVal)
    */
    
        //===Find Closest Unit Power===========================
        iNumUnitMin = 9999;                      // any formatting is better
        indxUnitMin =   -1;                      // no derived unit index
        dPwrUnitMin =  999.999;                  // no powers raised yet
        dSclUnitMin = -999.999;                  // no scaling factors
        iMaxUnit = tfAllowDerived ? EQSI_NUMUNIT : EQSI_NUMUNIT_BASE; // allow / disallow derived
    
        for(iUnit = 0; iUnit < iMaxUnit; iUnit++) {
            for(iBase = 0; iBase < EQSI_NUMUNIT_BASE; iBase++) {
                //---Scale factor---
                if (ddUnit[iBase] == 0.00 || CEquationSIUnit[iUnit][iBase] == 0.00) continue; // this base unit not used
                dScl = ddUnit[iBase] / CEquationSIUnit[iUnit][iBase]; // scale power by this unit
        
                //---Number used---
                dPwr = Math.abs(dScl);             // matched unit power
                iNum = 1;                          // matched unit coun
                for (k = 0; k < EQSI_NUMUNIT_BASE; k++) { // iNum=1: The matched unit counts as one
                    if ( k== iBase) continue;       // don't double-count base units
                    dVal = ddUnit[k] - (dScl*CEquationSIUnit[iUnit][k]); // check match
                    if (dVal == 0.00) continue;     // if exactly matches, don't include this base unit
                    iNum++;                         // otherwise we have to keep this base unit
                    dPwr += Math.ceil(Math.abs(dVal));        // count powers used
                    if(dVal - Math.floor(dVal) != 0.00) dPwr+=10; // penalize fractional powers
                }
                //---Keep if better---
                if(((iNum < iNumUnitMin) || (dPwr < dPwrUnitMin))
                    || ((iNum == iNumUnitMin) && (dScl > 0.00) && (dSclUnitMin < 0.00))) { // this condition takes Hz over 1/s
                    iNumUnitMin = iNum;             // new minimum number of base units
                    indxUnitMin = iUnit;            // use this derived unit
                    dPwrUnitMin = dPwr;             // total absolute powers used
                    dSclUnitMin = dScl;             // power scaling of this unit
                }
            }
        }
    
        //===Scale Unit========================================
        if (indxUnitMin >= 0) {
            for(iBase = 0; iBase < EQSI_NUMUNIT_BASE; iBase++) // offset matched unit powers
                ddUnit[iBase] -= dSclUnitMin*CEquationSIUnit[indxUnitMin][iBase];
        }
    
        //===Format Unit=======================================
        for(k = 1; k >= -1; k -= 2) {                  // repeat for top and bottom lines
            //---Solidus---
            if (k == -1) m_szUnit += "/";
        
            //---Matched---
            if ((indxUnitMin >= 0) && (SIGN(dSclUnitMin) == k)) {
                // for(psz=(char*)CEquationSIUnitStr, iUnit=0; iUnit<indxUnitMin; psz+=strlen(psz)+1, iUnit++);
                m_szUnit += CEquationSIUnitStr[indxUnitMin]; // append matched unit
                if(Math.abs(dSclUnitMin) != 1.00) m_szUnit += k*dSclUnitMin;
            }
        
            //---Base---
            for (iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) {
                if (k * ddUnit[iBase] <= 0.00) continue; // this base unit not used
                if ((strlen(m_szUnit) > 0) && (m_szUnit[strlen(m_szUnit) - 1] != '/')) m_szUnit += " ";
                m_szUnit += CEquationSIUnitStr[iBase];
                if (k * ddUnit[iBase] != 1.00) m_szUnit += k * ddUnit[iBase];
            }
        }
        if (m_szUnit[strlen(m_szUnit) - 1] == '/') m_szUnit = m_szUnit.substr(0, m_szUnit.length - 1); // truncate unused trailing solidus
    
    }
 
    Update();
    [txtEqn].concat(txtVarNames, txtVarValues).forEach(function (el) { el.addEventListener("keyup", Update); });
    txtEqn.focus();
};
