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
        [  1.0,     0,     0,     0,     0,     0,     0,    1.0,     0] //  0 EQSI_KG  = mass
        [    0,   1.0,     0,     0,     0,     0,     0,    1.0,     0] //  1 EQSI_M   = length
        [    0,     0,   1.0,     0,     0,     0,     0,    1.0,     0] //  2 EQSI_A   = electric current
        [    0,     0,     0,   1.0,     0,     0,     0,    1.0,     0] //  3 EQSI_S   = time
        [    0,     0,     0,     0,   1.0,     0,     0,    1.0,     0] //  4 EQSI_K   = therm. temperature
        [    0,     0,     0,     0,     0,   1.0,     0,    1.0,     0] //  5 EQSI_MOL = amount of substance
        [    0,     0,     0,     0,     0,     0,   1.0,    1.0,     0] //  6 EQSI_CD  = lum. intensity
        //---SI Derived Units------------------------
        [  1.0,   2.0,     0,  -3.0,     0,     0,     0,    1.0,     0] //  7 W  = J/s
        [  1.0,   2.0,     0,  -2.0,     0,     0,     0,    1.0,     0] //  8 J  = N m
        [  1.0,  -1.0,     0,  -2.0,     0,     0,     0,    1.0,     0] //  9 Pa = N/m2
        [  1.0,   1.0,     0,  -2.0,     0,     0,     0,    1.0,     0] // 10 N  = kg m /s2
        [    0,     0,     0,  -1.0,     0,     0,     0,    1.0,     0] // 11 Hz = 1/s
        [    0,     0,   1.0,   1.0,     0,     0,     0,    1.0,     0] // 12 C  = A s
        [  1.0,   2.0,  -1.0,  -3.0,     0,     0,     0,    1.0,     0] // 13 V  = W/A
        [ -1.0,  -2.0,   2.0,   4.0,     0,     0,     0,    1.0,     0] // 14 F  = C/V
        [  1.0,   2.0,  -2.0,  -3.0,     0,     0,     0,    1.0,     0] // 15 Ohm= V/A
        //---Allowed INPUT units only----------------
        [  1.0,     0,     0,     0,     0,     0,     0,    1.0e-3,  0] // 16 g -> kg
        [    0,   3.0,     0,     0,     0,     0,     0,    1.0e-3,  0] // 17 L -> m3
        [    0,     0,     0,     0,   1.0,     0,     0,    1.0,273.15] // 18 degC -> K
        [    0,     0,     0, 0, 1.0, 0, 0, 5.0/9.0,273.15-5.0/9.0*32.0] // 19 degF -> K
        [    0,   1.0,     0,     0,     0,     0,     0, 1609.344,   0] // 20 mi -> m
        [    0,   1.0,     0,     0,     0,     0,     0, 1852.0,     0] // 21 nmi -> m
        [    0,   1.0,     0,     0,     0,     0,     0,    0.9144,  0] // 22 yd -> m
        [    0,   1.0,     0,     0,     0,     0,     0,    0.3048,  0] // 23 ft -> m
        [    0,   1.0,     0,     0,     0,     0,     0,    2.54e-2, 0] // 24 in -> m
        [  1.0,   2.0,     0,  -2.0,     0,     0,   0,1.60217646e-19,0] // 25 eV -> J


        //---Dimensioned Constants-------------------
        // Offset by NUMUNIT_INPUT
        [    0,   1.0,     0,  -1.0,     0,     0,     0,    1.0,     0] //  0 c   = m/s
        [ -1.0,  -3.0,   2.0,   4.0,     0,     0,     0,    1.0,     0] //  1 e0  = F/m
        [  1.0,   1.0,  -2.0,  -2.0,     0,     0,     0,    1.0,     0] //  2 mu0 = N/A2
        [ -1.0,   3.0,     0,  -2.0,     0,     0,     0,    1.0,     0] //  3 G   = m3/ kg s2
        [  1.0,   2.0,     0,  -1.0,     0,     0,     0,    1.0,     0] //  4 h   = J s
        [    0,     0,     0,     0,     0,  -1.0,     0,    1.0,     0] //  5 N_A = 1/mol
        [  1.0,   2.0,     0,  -2.0,  -1.0,     0,     0,    1.0,     0] //  6 kB  = J/K
        [  1.0,   2.0,     0,  -2.0,  -1.0,  -1.0,     0,    1.0,     0] //  7 R   = J/K mol
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
    var poEquation;                             // operator stack
    var pvEquation;                             // value stack
    var piEquation;                             // operator location in source
    var szEquation;                             // equation source string

    var isPos;                                  // stack of operator positions (parse only)
    var isOps;                                  // stack of pending operations (parse only)


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
        DoEquation(ddVar);
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
        for (iOp = 0; iOp < poEquation.length; iOp++) { // each operator as row
            szRow = "";
            for (k = 0; k < piEquation[iOp]; k++) szRow += " "; // leading spaces
            szRow += "|";
            if (poEquation[iOp] == VOTYP_UNDEFINED) szRow += "!Undefined Valop";
            else if (poEquation[iOp] == VOTYP_VAL) szRow += "Value=" + pvEquation[iOp];
            else if (poEquation[iOp] == VOTYP_OP) szRow += "Operator:" + OP2STR(pvEquation[iOp]);
            else if (poEquation[iOp] == VOTYP_REF) szRow += "Variable[" + pvEquation[iOp] + "]";
            else if (poEquation[iOp] == VOTYP_UNIT) szRow += "Unit[" + puEquation[iOp] + "]";
            else if (poEquation[iOp] == VOTYP_NARGC) szRow += "nArgC=" + pvEquation[iOp];
            else szRow += "??Valop=" + poEquation[iOp];
            sz += szRow + "<BR>";
        }
        sz += "</PRE>"
        divStack.innerHTML = sz;
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
    function _ParseEquationUnits(_szEqtn, iThisPt, iBrktOff)
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
        var oThisValop;                       // operator for stack
        var vThisValop;                       // value    for stack
        var iThisValop;                       // location for stack

        var szErrMsg;                            // error message in answer box

        //===Prepare New Equation==============================
        poEquation = new Array();                // start with empty operator..
        pvEquation = new Array();                //..value, and..
        piEquation = new Array();                //..position stacks
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
                                    poEquation.push(VOTYP_REF);
                                    pvEquation.push(iVrbl);
                                    piEquation.push(iThisPt);
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
                                poEquation.push(VOTYP_VAL);
                                pvEquation.push(CEquationSIConst[iCnst]);
                                piEquation.push(iThisPt);  // store const's position
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

                        ///            //---hanging unit---
                        ///            if(UnitsEnabled()) {
                        ///               iThisScan = _ParseEquationUnits(_szEqtn, iThisPt, iBrktOff, isOps, isPos, vosParsEqn, uLookFor);
                        ///               if(iThisScan > 0) { uLookFor = LOOKFOR_BINARYOP; break; }
                        ///            }
                        iError = EQERR_PARSE_UNKNOWNFUNCVAR;

                        //---Negative sign---
                        // For sho':  -2^2 = -4 according to Matlab, so - sign must be
                        // processed before scanning for a number here
                    } else if (_szEqtn[iThisPt] == '-') {
                        poEquation.push(VOTYP_VAL);
                        pvEquation.push(-1.0000);
                        piEquation.push(iThisPt);
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
                            poEquation.push(VOTYP_VAL);     // store value
                            pvEquation.push(dThisVal);      // value from scanFloat
                            piEquation.push(iThisPt);       // current position
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
                                isOps.splice(isOps.length - iCnst, 0, iVrbl);
                                isPos.splice(isOps.length - iCnst, 0, isPos[isPos.length - iCnst]);
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
                            if ((poEquation.length <= 0) || (poEquation[poEquation.length - 1] != VOTYP_REF)) {
                                iError = EQERR_PARSE_ASSIGNNOTVAR;
                                iThisPt--;
                                break;
                            }
                            poEquation.pop();                 // remove variable OP_REF from stack
                            isOps.push(pvEquation.pop());     // store reference as "operator"
                            isPos.push(piEquation.pop());     // source string location
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
                    if (iThisOp - iBrktOff > OP_BINARYMAX) iThisScan = 0; // catch non-binary operators
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
            szErrMsg += "| " + ErrorString(iError);
            txtAns.value = szErrMsg;
        }
        return (iError);
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
        var oThisValop;                          // structure element added to equation stack
        var vThisValop;
        var iThisValop;

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
            poEquation.push(VOTYP_OP);            // operator type
            pvEquation.push(iPrevOp);             // operation
            piEquation.push(isPos.pop());         // source string location

            //---Set--------------
            if (iPrevOp == OP_SET) {
                poEquation.push(VOTYP_REF);         // variable reference comes next
                pvEquation.push(isOps.pop());       // variable ref earlier stored as "operator"
                piEquation.push(isPos.pop());       // source string location
            }

            //---Variable-arg-----
            iPrevOp -= OP_NARG;                   // offset to check for multi-arg op
            if ((iPrevOp >= 0) && (iPrevOp < NUM_NARGOP) && CEquationNArgOpArgc[iPrevOp] < 0) {
                poEquation.push(VOTYP_NARGC);      // argument count type
                pvEquation.push(isOps.pop());      // arg count was earlier stored as "operator"
                piEquation.push(isPos.pop());      // source string location
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



    /*********************************************************
    *  DoEquation
    *  Perform calculation, using the variables given.
    * I'm stripping out all of the units processing here
    *********************************************************/
    function DoEquation(dVar) {
        var dsVals = new Array();                // RPN stack of values
        var usUnits = new Array();               // RPN stack of unit factors
        var oThisValop, vThisValop, iThisValop;  // token being processed
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

        if (poEquation.length <= 0) return (iError = EQERR_EVAL_NOEQUATION);

        iError = EQERR_NONE;                     // no error
        for (iThisPt = 0; iThisPt < poEquation.length && iError == EQERR_NONE; iThisPt++) {
            oThisValop = poEquation[iThisPt];     // current operator
            vThisValop = pvEquation[iThisPt];     // current value
            iThisValop = piEquation[iThisPt];     // current source location

            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            // Simple Cases
            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            switch (oThisValop) {
                //===Store a value==================================
                case VOTYP_VAL:
                case VOTYP_PREFIX:
                    dsVals.push(vThisValop);
                    break;

                //===Variable=======================================
                case VOTYP_REF:
                    if ((vThisValop >= 0) && (vThisValop < dVar.length)) {
                        dsVals.push(dVar[vThisValop]); // save variable value
                    } else {                           // need supplied variable values
                        dsVals.push(0.000);
                        iError = EQERR_EVAL_CONTAINSVAR;
                    }
                    break;


                //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                // Operators
                //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                case VOTYP_OP:
                    //===Assignment Operator=========================
                    if (vThisValop == OP_SET) {
                        ///TODO:Assign Flag            if((dVar==NULL) || (AssignEnabled()==FALSE)) { iError = EQERR_EVAL_ASSIGNNOTALLOWED; break; }
                        if (dsVals.length < 1) { iError = EQERR_EVAL_STACKUNDERFLOW; break; }
                        iThisPt++;                      // get variable reference from next
                        if (iThisPt >= poEquation.length) { iError = EQERR_EVAL_STACKUNDERFLOW; break; }
                        if (poEquation[iThisPt] != VOTYP_REF) { iError = EQERR_EVAL_BADTOKEN; break; }
                        dVar[pvEquation[iThisPt]] = dsVals[dsVals.length - 1]; // assign (leave in stack)
                        break;
                    }

                    //===Binary Operators============================
                    if (vThisValop < OP_UNARY) {
                        if (dsVals.length < 2) iError = EQERR_EVAL_STACKUNDERFLOW;
                        dArg2 = dsVals.pop();           // get second and..
                        dArg1 = dsVals.pop();           //..first arguments of op

                        //---Check easy math errors---------
                        switch (vThisValop) {
                            case OP_DIV: if (dArg2 == 0) { dArg2 = 1.00; iError = EQERR_MATH_DIV_ZERO; } break;
                            case OP_POW:
                                if (dArg1 < 0.00) dArg2 = floor(dArg2 + 0.50); // prevent fractions on negatives
                                if ((dArg1 == 0.00) && (dArg2 < 0.00)) { dArg1 = 1.00; iError = EQERR_MATH_DIV_ZERO; }
                                break;
                        }

                        //---Perform Op---------------------
                        switch (vThisValop) {
                            case OP_PSH: dsVals.push(dArg1); dVal = dArg2; break; // restore both to stack
                            case OP_POP: dVal = dArg2; break; // ignore first argument
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
                    } else if (vThisValop < OP_NARG) {
                        if (dsVals.length < 1) iError = EQERR_EVAL_STACKUNDERFLOW;
                        dArg1 = dsVals.pop();           // single function argument

                        switch (vThisValop - OP_UNARY) {
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
                        switch (vThisValop - OP_UNARY) {
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
                        if (dsVals.length < Math.abs(CEquationNArgOpArgc[vThisValop - OP_NARG])) iError = EQERR_EVAL_STACKUNDERFLOW;
                        //---2-Argument---------------------
                        if (CEquationNArgOpArgc[vThisValop - OP_NARG] == 2) {
                            dArg2 = dsVals.pop();
                            dArg1 = dsVals.pop();

                            switch (vThisValop - OP_NARG) {
                                case OP_NARG_MOD:            // see Matlab's definitions..
                                case OP_NARG_REM:            //..of MOD and REM!
                                    if (dArg2 == 0.00) {
                                        if ((vThisValop - OP_NARG) == OP_NARG_MOD) dVal = dArg1;
                                        else iError = EQERR_MATH_DIV_ZERO;
                                        break;
                                    }

                                    dVal = dArg1 - dArg2 * Math.floor(dArg1 / dArg2);
                                    if ((vThisValop - OP_NARG) == OP_NARG_REM) {
                                        //                     if(SIGN(dArg1) != SIGN(dArg2)) dVal -= dArg2;
                                        if (((dArg1 > 0.00) && (dArg2 < 0.00))
                                            || ((dArg1 < 0.00) && (dArg2 > 0.00))) dVal -= dArg2;
                                        ///TODO: Is that correct?!
                                    }
                                    break;

                                case OP_NARG_ATAN2:
                                case OP_NARG_ATAN2D:
                                    dVal = (dArg2 == 0.00) ?
                                        ((dArg1 == 0.00) ? 0.00 : ((dArg1 > 0.00) ? M_PI / 2.00 : -M_PI / 2.00))
                                        : Math.atan2(dArg1, dArg2);
                                    if ((vThisValop - OP_NARG) == OP_NARG_ATAN2D) dVal *= M_180_PI;
                                    break;

                                default: iError = EQERR_EVAL_UNKNOWNNARGOP;
                            }
                            //---Variable-Argument--------------
                        } else if (CEquationNArgOpArgc[vThisValop - OP_NARG] < 0) {
                            iThisPt++;
                            if (iThisPt >= poEquation.length) { iError = EQERR_EVAL_STACKUNDERFLOW; break; }
                            if (poEquation[iThisPt] != VOTYP_NARGC) { iError = EQERR_EVAL_UNKNOWNNARGOP; break; }
                            switch (vThisValop - OP_NARG) {
                                case OP_NARG_MAX:
                                case OP_NARG_MIN:
                                    dVal = dsVals.pop();
                                    for (iArg = 1; iArg < pvEquation[iThisPt]; iArg++) {
                                        dArg1 = dsVals.pop();

                                        switch (vThisValop - OP_NARG) {
                                            case OP_NARG_MAX: if (dArg1 > dVal) dVal = dArg1; break;
                                            case OP_NARG_MIN: if (dArg1 < dVal) dVal = dArg1; break;
                                        }
                                    }
                                    break;

                                default: iError = EQERR_EVAL_UNKNOWNNARGOP;
                            }
                            //---Remaining N-Argument-----------
                        } else {
                            switch (vThisValop - OP_NARG) {
                                case OP_NARG_IF:
                                    dArg2 = dsVals.pop(); // value-if-false
                                    dArg1 = dsVals.pop(); // value-if-true
                                    dVal = dsVals.pop(); // conditional test
                                    dVal = (dVal == 0.00) ? dArg2 : dArg1;
                                    break;
                                default: iError = EQERR_EVAL_UNKNOWNNARGOP;
                            }
                        }
                    }//if
                    dsVals.push(dVal);             // store operation result on stack
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
            iErrorLocation = (iThisPt - 1 < poEquation.length) ? // store where processing failed..
                piEquation[iThisPt - 1] : 0;

            szErrMsg = "";
            for (iThisPt = 0; iThisPt < iErrorLocation; iThisPt++) szErrMsg += " "; // leading spaces
            szErrMsg += "| " + ErrorString(iError);
            txtAns.value = szErrMsg;
            return (iError);                       //..and return with error
        }

        //===Final Answer======================================
        dVal = dsVals.pop();                     // last value is answer
        txtAns.value = dVal;

        //---Return----------------------------------
        return (iError = EQERR_NONE);               // return OK flag
    }

    Update();
    [txtEqn].concat(txtVarNames, txtVarValues).forEach(function (el) { el.addEventListener("keyup", Update); });
    txtEqn.focus();
};