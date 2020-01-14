/*****************************************************************************
*  CLCEqtn.h (CxEqtn.h v1.0+)                           CÆSIVM LaserCanvas
*  Equation class implementation for LaserCanvas Rev. 4
* $PSchlup 2004-2006 $     $Revision 6 $
*****************************************************************************/
#ifndef CLCEQTN_H
#define CLCEQTN_H
class CEquation;                            // CEquation object for LaserCanvas

#define CLCEQTN_SZVERSION "CEquation v7a"    // revision string

#include <windows.h>                        // standard Windows header
#include <stdio.h>                          // for sprintf
#include <string.h>                         // string manipulation
#include <math.h>                           // standard Math library

//---Macros-------------------------------------
#ifndef MAX
#define MAX(a,b)  ((a)>(b)?(a):(b))
#endif/*MAX*/
#ifndef MIN
#define MIN(a,b)  ((a)<(b)?(a):(b))
#endif/*MIN*/
#ifndef ABS
# define ABS(x) (((x)<0)? (-(x)) : (x))
#endif/*ABS*/
#ifndef SIGN
# define SIGN(x) ( ((x)==0.00) ? 0 : (((x)>0) ? +1 : -1) )
#endif//SIGN
#ifndef M_PI
# define M_PI 3.1415926536897932
#endif//M_PI

//---Characters---------------------------------
// ILLEGALCHAR: Characters not ever allowed in the string
#define EQ_ILLEGALCHAR "`~@$%[]{}?\;:"

// VALIDCHAR: Valid first characters of variable name
#define EQ_VALIDCHAR "abcdefghijklmnopqrstuvwxyz_ABCDEFGHIJKLMNOPQRSTUVWXYZ"

// VALIDSYMB: Valid variable name symbols
#define EQ_VALIDSYMB "abcdefghijklmnopqrstuvwxyz_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'\""

//===Operators============================================
#define OP_NULL             0x0000
#define OP_PSH                   1          // comma (Push) binary op
#define OP_POP                   2          // remove (comma in non-multi situations)
#define OP_SET                   3          // set (variable = expression)

#define OP_BINARYMIN             4          // first "real" binary operator
//                               | - equal
#define OP_OR                    4          // or ||
#define OP_AND                   5          // and &&

#define OP_RELOPMIN              6          // start of relational operators
#define OP_LTE                   6          // less or equal <=
#define OP_GTE                   7          // greater or equal >=
#define OP_LT                    8          // less than <
#define OP_GT                    9          // greater than >
#define OP_NEQ                  10          // not equal !=
#define OP_EQ                   11          // equal ==
#define OP_RELOPMAX             11          // end of relation operators

#define OP_ADD                  12          // ascending in precedence order
#define OP_SUB                  13
#define OP_MUL                  14
#define OP_DIV                  15
#define OP_POW                  16
//                               | - equal
#define OP_BINARYMAX            16          // last real binary operator

#define OP_UNARY                20          // unary ops have OP_UNARY added
#define OP_ABS                   0
#define OP_SQRT                  1
#define OP_EXP                   2
#define OP_LOG                   3
#define OP_LOG10                 4
#define OP_CEIL                  5
#define OP_FLOOR                 6
#define OP_COS                   7
#define OP_SIN                   8
#define OP_TAN                   9
#define OP_ACOS                 10
#define OP_ASIN                 11
#define OP_ATAN                 12
#define OP_COSH                 13
#define OP_SINH                 14
#define OP_TANH                 15
#define OP_SIND                 16
#define OP_COSD                 17
#define OP_TAND                 18
#define OP_ASIND                19
#define OP_ACOSD                20
#define OP_ATAND                21
#define OP_NOT                  22          // not !
#define OP_SIGN                 23
#define OP_ROUND                24
#define NUM_UNARYOP             25          // number of defined unary ops

#define OP_NARG                 50          // n-arg ops have OP_NARG added
#define OP_NARG_MOD              0
#define OP_NARG_REM              1
#define OP_NARG_ATAN2            2
#define OP_NARG_ATAN2D           3
#define OP_NARG_MAX              4
#define OP_NARG_MIN              5
#define OP_NARG_IF               6
#define NUM_NARGOP               7          // number of define n-arg ops

#define OP_BRACKETOFFSET       100          // added for each nested bracket

//---Character strings--------------------------
// Each operator / constant is terminated by a single NULL character. The loops
// count up to NUM_UNARYOP and NUM_CONSTANT, so ensure these values are correct

const char CEquationBinaryOpStr[] =
   "+\0-\0*\0/\0^\0||\0&&\0<=\0>=\0<\0>\0!=\0==\0";

const char CEquationUnaryOpStr[] =
   "abs\0sqrt\0exp\0log\0log10\0ceil\0floor\0cos\0sin\0tan\0"
   "acos\0asin\0atan\0cosh\0sinh\0tanh\0sind\0cosd\0tand\0asind\0"
   "acosd\0atand\0!\0sign\0round\0";

const char CEquationNArgOpStr[] =           // n-arg operator strings
   "mod\0rem\0atan2\0atan2d\0max\0min\0if\0";
const int CEquationNArgOpArgc[NUM_NARGOP] = { // n-arg operator argument counts (-ve: min arg count)
   2,2,2,2,-2,-2,3};

#define OP2STR(o) (\
   (o==OP_PSH)           ? "Push" : \
   (o==OP_POP)           ? "Pop" : \
   (o==OP_SET)           ? "Assign" : \
   (o==OP_ADD)           ? "+" : \
   (o==OP_SUB)           ? "-" : \
   (o==OP_DIV)           ? "/" : \
   (o==OP_MUL)           ? "*" : \
   (o==OP_POW)           ? "^" : \
   (o==OP_OR)            ? "Or" : \
   (o==OP_AND)           ? "And" : \
   (o==OP_LTE)           ? "<=" : \
   (o==OP_GTE)           ? ">=" : \
   (o==OP_LT )           ? "<" : \
   (o==OP_GT )           ? ">" : \
   (o==OP_NEQ)           ? "!=" : \
   (o==OP_EQ )           ? "==" : \
   (o-OP_UNARY)==OP_ABS  ? "Abs" : \
   (o-OP_UNARY)==OP_SQRT ? "Sqrt" : \
   (o-OP_UNARY)==OP_EXP  ? "Exp" : \
   (o-OP_UNARY)==OP_LOG10? "Log10" : \
   (o-OP_UNARY)==OP_LOG  ? "Log" : \
   (o-OP_UNARY)==OP_CEIL ? "Ceil" : \
   (o-OP_UNARY)==OP_FLOOR? "Floor" : \
   (o-OP_UNARY)==OP_COS  ? "Cos" : \
   (o-OP_UNARY)==OP_SIN  ? "Sin" : \
   (o-OP_UNARY)==OP_TAN  ? "Tan" : \
   (o-OP_UNARY)==OP_ACOS ? "ACos" : \
   (o-OP_UNARY)==OP_ASIN ? "ASin" : \
   (o-OP_UNARY)==OP_ATAN ? "ATan" : \
   (o-OP_UNARY)==OP_COSH ? "Cosh" : \
   (o-OP_UNARY)==OP_SINH ? "Sinh" : \
   (o-OP_UNARY)==OP_TANH ? "Tanh" : \
   (o-OP_UNARY)==OP_SIND ? "SinD" : \
   (o-OP_UNARY)==OP_COSD ? "CosD" : \
   (o-OP_UNARY)==OP_TAND ? "TanD" : \
   (o-OP_UNARY)==OP_ASIND? "ASinD" : \
   (o-OP_UNARY)==OP_ACOSD? "ACosD" : \
   (o-OP_UNARY)==OP_ATAND? "ATanD" : \
   (o-OP_UNARY)==OP_NOT  ? "Not" : \
   (o-OP_UNARY)==OP_SIGN ? "Sign" : \
   (o-OP_UNARY)==OP_ROUND? "Round" : \
   (o-OP_NARG )==OP_NARG_MOD   ? "Mod" : \
   (o-OP_NARG )==OP_NARG_REM   ? "Rem" : \
   (o-OP_NARG )==OP_NARG_ATAN2 ? "Atan2" : \
   (o-OP_NARG )==OP_NARG_ATAN2D? "Atan2D" : \
   (o-OP_NARG )==OP_NARG_MAX   ? "Max" : \
   (o-OP_NARG )==OP_NARG_MIN   ? "Min" : \
   (o-OP_NARG )==OP_NARG_IF    ? "If" : \
   "*unknown*")

//===Units and Dimensions=================================
// VALIDUNIT: Valid characters in units (including prefixes)
#define EQ_VALIDUNIT "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

// The dimensioned constants store an INDEX into the same
// array as used for the named constants. The ordering is
//  - Base units first; followed by
//  - Named units; followed by
//  - Units used in dimensioned constants
// Why? Because when VOTYP_UNIT  is evaluated, it expects
// a single value that is the index into the units list.
#define EQSI_NUMDIM_SCL               9     // number of base unit dimensions plus scale factor coefficients

#define EQSI_NUMUNIT_BASE             7     // number of SI base units
#define EQSI_NUMUNIT                 16     // total number named units for output (base plus derived)
#define EQSI_NUMUNIT_INPUT           26     // number of units for input

#define EQSI_NUMUNIT_CONST            8     // number of units for dimensioned constants

typedef struct tagUNITBASE {                // this needs to be a STRUCT for TEqStack
   double d[EQSI_NUMUNIT_BASE];
} UNITBASE;

const double CEquationSIUnit[EQSI_NUMUNIT_INPUT+EQSI_NUMUNIT_CONST][EQSI_NUMDIM_SCL] = {
   // kg      m      A      s      K     mol    cd    scale offset
   // Values EARLIER in the table take precedence
   //---SI Base Units---------------------------
   {  1.0,     0,     0,     0,     0,     0,     0,    1.0,     0}, //  0 EQSI_KG  = mass
   {    0,   1.0,     0,     0,     0,     0,     0,    1.0,     0}, //  1 EQSI_M   = length
   {    0,     0,   1.0,     0,     0,     0,     0,    1.0,     0}, //  2 EQSI_A   = electric current
   {    0,     0,     0,   1.0,     0,     0,     0,    1.0,     0}, //  3 EQSI_S   = time
   {    0,     0,     0,     0,   1.0,     0,     0,    1.0,     0}, //  4 EQSI_K   = therm. temperature
   {    0,     0,     0,     0,     0,   1.0,     0,    1.0,     0}, //  5 EQSI_MOL = amount of substance
   {    0,     0,     0,     0,     0,     0,   1.0,    1.0,     0}, //  6 EQSI_CD  = lum. intensity
   //---SI Derived Units------------------------
   {  1.0,   2.0,     0,  -3.0,     0,     0,     0,    1.0,     0}, //  7 W  = J/s
   {  1.0,   2.0,     0,  -2.0,     0,     0,     0,    1.0,     0}, //  8 J  = N m
   {  1.0,  -1.0,     0,  -2.0,     0,     0,     0,    1.0,     0}, //  9 Pa = N/m2
   {  1.0,   1.0,     0,  -2.0,     0,     0,     0,    1.0,     0}, // 10 N  = kg m /s2
   {    0,     0,     0,  -1.0,     0,     0,     0,    1.0,     0}, // 11 Hz = 1/s
   {    0,     0,   1.0,   1.0,     0,     0,     0,    1.0,     0}, // 12 C  = A s
   {  1.0,   2.0,  -1.0,  -3.0,     0,     0,     0,    1.0,     0}, // 13 V  = W/A
   { -1.0,  -2.0,   2.0,   4.0,     0,     0,     0,    1.0,     0}, // 14 F  = C/V
   {  1.0,   2.0,  -2.0,  -3.0,     0,     0,     0,    1.0,     0}, // 15 Ohm= V/A
   //---Allowed INPUT units only----------------
   {  1.0,     0,     0,     0,     0,     0,     0,    1.0e-3,  0}, // 16 g -> kg
   {    0,   3.0,     0,     0,     0,     0,     0,    1.0e-3,  0}, // 17 L -> m3
   {    0,     0,     0,     0,   1.0,     0,     0,    1.0,273.15}, // 18 degC -> K
   {    0,     0,     0, 0, 1.0, 0, 0, 5.0/9.0,273.15-5.0/9.0*32.0}, // 19 degF -> K
   {    0,   1.0,     0,     0,     0,     0,     0, 1609.344,   0}, // 20 mi -> m
   {    0,   1.0,     0,     0,     0,     0,     0, 1852.0,     0}, // 21 nmi -> m
   {    0,   1.0,     0,     0,     0,     0,     0,    0.9144,  0}, // 22 yd -> m
   {    0,   1.0,     0,     0,     0,     0,     0,    0.3048,  0}, // 23 ft -> m
   {    0,   1.0,     0,     0,     0,     0,     0,    2.54e-2, 0}, // 24 in -> m
   {  1.0,   2.0,     0,  -2.0,     0,     0,   0,1.60217646e-19,0}, // 25 eV -> J


   //---Dimensioned Constants-------------------
   // Offset by NUMUNIT_INPUT
   {    0,   1.0,     0,  -1.0,     0,     0,     0,    1.0,     0}, //  0 c   = m/s
   { -1.0,  -3.0,   2.0,   4.0,     0,     0,     0,    1.0,     0}, //  1 e0  = F/m
   {  1.0,   1.0,  -2.0,  -2.0,     0,     0,     0,    1.0,     0}, //  2 mu0 = N/A2
   { -1.0,   3.0,     0,  -2.0,     0,     0,     0,    1.0,     0}, //  3 G   = m3/ kg s2
   {  1.0,   2.0,     0,  -1.0,     0,     0,     0,    1.0,     0}, //  4 h   = J s
   {    0,     0,     0,     0,     0,  -1.0,     0,    1.0,     0}, //  5 N_A = 1/mol
   {  1.0,   2.0,     0,  -2.0,  -1.0,     0,     0,    1.0,     0}, //  6 kB  = J/K
   {  1.0,   2.0,     0,  -2.0,  -1.0,  -1.0,     0,    1.0,     0}, //  7 R   = J/K mol
};

const char CEquationSIUnitStr[] =
// Base units . . . . . . | Derived units . . .          | Constants . .
"kg\0m\0A\0s\0K\0mol\0cd\0W\0J\0Pa\0N\0Hz\0C\0V\0F\0Ohm\0"
"g\0L\0degC\0degF\0mi\0nmi\0yd\0ft\0\in\0eV\0" // input only units
"m/s\0F/m\0N/A2\0m3/kg s2\0J s\0/mol\0J/K\0J/K mol\0" // constants
;

//---Prefixes-----------------------------------
#define EQSI_NUMUNIT_PREFIX          11     // number of recognized prefixes
#define EQSI_NUMUNIT_PREFIX_OUTPUT   10     // number of prefixes used in output

const double CEquationSIUnitPrefix[EQSI_NUMUNIT_PREFIX] =
   {1e12,1e9,1e6,1e3,100,0.01,1e-3,1e-6,1e-9,1e-12,1e-15};
const char CEquationSIUnitPrefixStr[] = "TGMkhcmunpf";

// Used for auto-adjustment, disabled for now
//const double CEquationSIUnitPrefixOutput[EQSI_NUMUNIT_PREFIX_OUTPUT] =
//   {1e12,1e9,1e6,1e3,1,1e-3,1e-6,1e-9,1e-12,1e-15};
//const char CEquationSIUnitPrefixOutputStr[] = "TGMk*munpf";

//===Dimensioned Constants================================
#define EQSI_NUMCONST                17     // number of dimensioned constants
const int CEquationSIConstUnitIndx[EQSI_NUMCONST] = {
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
};

const double CEquationSIConst[EQSI_NUMCONST] = {
   M_PI,                // pi
   299792458,           // c
   376.730313461,       // Z0
   8.854187817e-12,     // e0
   4e-7*M_PI,           // mu0
   6.67428e-11,         // G
   6.62606896e-34,      // h
   6.62606896e-34/(2.00*M_PI), // hbar = h/2pi
   1.602176487e-19,     // e
   6.64465620e-27,      // m_alpha
   9.10938215e-31,      // m_e
   1.674927211e-27,     // m_n
   1.672621637e-27,     // m_p
   1.660538782e-27,     // m_u
   6.02214179e23,       // N_A
   1.3806504e-23,       // kB
   8.314472,            // R
};

const char CEquationSIUnitConstStr[] =
"pi\0c\0Z0\0e0\0mu0\0G\0h\0hbar\0e\0m_alpha\0m_e\0m_n\0m_p\0m_u\0N_A\0kB\0R\0";



//===Errors===============================================
#define EQERR_NONE                    0     // no error

#define EQERR_PARSE_ALLOCFAIL        -1     // could not allocate memory
#define EQERR_PARSE_NOEQUATION       -2     // there's no equation

#define EQERR_PARSE_NUMBEREXPECTED    1     // looking for number, (, -sign, or unary op
#define EQERR_PARSE_UNKNOWNFUNCVAR    2
#define EQERR_PARSE_BRACKETEXPECTED   3     // expecting ( (after unary operator)
#define EQERR_PARSE_BINARYOPEXPECTED  4     // expecting +-*/^ operator
#define EQERR_PARSE_BRACKETSOPEN      5     // not enough closing brackets
#define EQERR_PARSE_UNOPENEDBRACKET   6     // not enough opening brackets
#define EQERR_PARSE_NOADVANCE         7     // current token failed to advance iThisScan
#define EQERR_PARSE_CONTAINSVAR       8     // contains vars when not permitted
#define EQERR_PARSE_NARGBADCOUNT      9     // wrong number of arguments to function
#define EQERR_PARSE_STACKOVERFLOW    10     // stack overflow, too many ops
#define EQERR_PARSE_ASSIGNNOTVAR     11     // assignment needs variable
#define EQERR_PARSE_UNITEXPECTED     12     // expected unit after "in" keyword
#define EQERR_PARSE_UNITALREADYDEF   13     // target unit already defined
#define EQERR_PARSE_UNITINCOMPATIBLE 14     // incompatible unit
#define EQERR_PARSE_ILLEGALCHAR      99     // illegal character

#define EQERR_EVAL_UNKNOWNBINARYOP  101     // Unknown binary operator
#define EQERR_EVAL_UNKNOWNUNARYOP   102     // Unknown unary operator
#define EQERR_EVAL_UNKNOWNNARGOP    103     // Unkown n-arg operator
#define EQERR_EVAL_UNKNOWNVALOP     104     // Unknown Valop type
#define EQERR_EVAL_STACKNOTEMPTY    105     // Stack not empty at end of equation
#define EQERR_EVAL_STACKUNDERFLOW   106     // Stack hasn't enough entries
#define EQERR_EVAL_CONTAINSVAR      108     // contains variables than are not supplied
#define EQERR_EVAL_BADTOKEN         109     // not right type of token
#define EQERR_EVAL_ASSIGNNOTALLOWED 110     // not allowed to change variables
#define EQERR_EVAL_UNITMISMATCH     111     // mismatched units
#define EQERR_EVAL_UNITNOTDIMLESS   112     // unit on expected dimensionless arg
#define EQERR_EVAL_NOEQUATION       199     // there is no equation to evaluate

#define EQERR_MATH_DIV_ZERO         201     // division by zero
#define EQERR_MATH_DOMAIN           202     // domain error (acos, etc) (sometimes cplx)
#define EQERR_MATH_SQRT_NEG         203     // square root of negative (--> cplx)
#define EQERR_MATH_LOG_ZERO         204     // log of zero - always undefined
#define EQERR_MATH_LOG_NEG          205     // log of negative (--> cplx)
#define EQERR_MATH_OVERFLOW         206     // exp(large number) overflow

//---Parse status-------------------------------
#define LOOKFOR_NUMBER     0x01  // number, unary op, parentheses, negative, constant
#define LOOKFOR_BINARYOP   0x02  // binary op only
#define LOOKFOR_BRACKET    0x03  // brackets only (after unary op)

//===Operator stack typedef===============================
template<class T> class TEqStack;

//---Valop types--------------------------------
#define VOTYP_UNDEFINED       0x00          // undefined
#define VOTYP_VAL             0x01          // valop is numeric value
#define VOTYP_OP              0x02          // valop is built-in operator or function
#define VOTYP_REF             0x03          // valop is index into variable array
#define VOTYP_UNIT            0x04          // unit: immediate multiply by value
#define VOTYP_NARGC           0x05          // n-argument count whenever bracket is closed
#define VOTYP_PREFIX          0x06          // same effect as TYP_VAL

//---Data Structure-------------------
typedef struct tagVALOP {
   unsigned char   uTyp;                    // type (op, value, variable)
   union {
      double    dVal;                    // value for constants
      unsigned int uOp;                     // operator code
      int          iRef;                    // index into variable array
      int          iUnit;                   // index into unit array
      int          iArgc;                   // number of pushed arguments
   };
   int             iPos;                    // position in source string
} VALOP, *PVALOP;

/*********************************************************
* CEquation declaration
*********************************************************/
class CEquation {
private:
   char  *pszSrcEquation;                   // string of equation source
   int    iEqnLength;                       // number of legitimate ops in valop stack
   VALOP *pvoEquation;                      // array of ops
   int    iError;                           // error that occured
   int    iErrorLocation;                   // location of error (pointer into SrcEquation)
   char   m_szUnit[32];                     // formatted string before output
   UNITBASE m_uUnitTarget;                  // target unit base
   double   m_dScleTarget;                  // target scaling
   double   m_dOffsTarget;                  // target offset

   BOOL   SetSrcEquation(const char *sz);   // allocate memory and set source equation string
   void   FreeSrcEquation(void);            // free previously allocated buffer
   BOOL   AllocEquation(int iNumOps);       // allocate memory for the VALOP stack
   void   FreeEquation(void);               // free previously allocated memory
   int   _ProcessOps(TEqStack<VALOP> *pvosParsEqn, TEqStack<int> *pisOps, TEqStack<int> *pisPos, int iThisOp, int iBrktOff);

   int   _ParseEquationUnits(const char *_szEqtnOffset, int iThisPt, int iBrktOff,
      TEqStack<int> &isOps, TEqStack<int> &isPos, TEqStack<VALOP> &vosParsEqn,
      UINT uLookFor);

   void _AnswerUnitString(double *pdVal, UNITBASE *puUnit, BOOL tfAllowDerived=TRUE); // automatic determination of answer
public:   int  _StringToUnit(const char *_szEqtnOffset, char *pszUnitOut, int iLen, UNITBASE *pUnit, double *pdScale, double *pdOffset);


public:
   CEquation(void);                         // constructor and initialization
   ~CEquation();                            // destructor
   int    ParseEquation(const char *szEqn, const char *pszVars); // supply a new string and parse it
   int    DoEquation(double dVar[], double *dAns, BOOL tfAllowAssign=FALSE, BOOL tfAllowDerived=FALSE); // calculate equation - returns err code
   double Answer(double dVar[], BOOL tfAllowAssign=FALSE);      // overloaded equation solver, no error info
   void   GetEquationString(char *szBuf, size_t len); // get source string
   int    GetLastError(char *szBuffer, size_t len); // position and description of last error
   void   LastErrorMessage(char *szBuffer, size_t len, const char *szSource); // formatted message string
   //void   LastErrorMessageBox(HWND hWnd, const char *szTitle); // MessageBox describing last error

   BOOL   ParseConstantEquation(const char *szEqtn, double *pdAns); // parse an equation without variables
   int    ParseDoubleEquation(double dVal, const char *pszFmt=NULL); // create an equation for a value
   BOOL   ContainsUnits(void);              // returns TRUE if units within equation
   int    ContainsVariables(void);          // returns EQERR_CONTAINS_VARIABLE if one or more variables are used
   int    ContainsVariable(int iVar);       // returns EQERR_CONTAINS_VARIABLE if given variable is use
   VALOP *GetEquationStack(void) { return(pvoEquation); }; // returns pointer to equation stack (debug only)
   int    GetEquationLength(void) { return(iEqnLength); }; // returns equation length (debug only)

   const char* _GetSrcEqStr(void) { return(pszSrcEquation); }; // returns pointer to internal source equation (debug only)
   const char* _AnswerUnitStr(void) { return(m_szUnit); }; // return last formatted unit (for convenience)
};

/*********************************************************
*  Stack Template
*********************************************************/
#define EQSTACK_CHUNK                16     // chunks of elements to allocate at a time
template<class T> class TEqStack {
private:
   T   *tStck;                              // array of values
   T    tNul;                               // NULL returned on errors
   int  iLen;                               // number of entries allocated
   int  iTop;                               // pointer to top of stack
   int  Alloc(int iNewLen);                 // allocate more memory
public:
   TEqStack(void);                          // initialize
   ~TEqStack();                             // exit
   int  Push(T t);                          // push a value - return top
   T    Pop(void);                          // pop a value
   T    Peek(void);                         // show top value without popping it
   int  Top(void);                          // get top of stack
   T    PeekBack(int iOffs=-1);             // peek further back (iOffs -ve)
   int  InsertBack(T t, int iOffs);         // insert a value further back (iOffs -ve)
   void Display(const char *pszHead, const char *pszFmt);
};

//---Management---------------------------------
template <class T>
TEqStack<T>::TEqStack(void) {
   tStck = (T*) NULL; iLen = 0;             // nothing allocated yet
   memset(&tNul, 0x00, sizeof(T));          // prepare NULL for errors
   iTop = 0;                                // no elements in stack
   Alloc(EQSTACK_CHUNK);                    // allocate some space
}

template <class T>
TEqStack<T>::~TEqStack() {
   if(tStck) delete(tStck); tStck = (T*) NULL; iLen = 0; // free existing
}

template <class T>
int TEqStack<T>::Alloc(int iNewLen) {
   T *ptStckNew;                            // new stack
   if((iNewLen==iLen) || (iNewLen<iTop)) return(iLen);   // ignore non-changes and too-smalls
   ptStckNew = (T*) malloc(iNewLen * sizeof(T));         // allocate new stack
   if(ptStckNew == (T*) NULL) return(iLen);              // return existing length on alloc failure
   memset(ptStckNew, 0x00, iNewLen * sizeof(T));         // clear stack (not really necessary)
   memcpy(ptStckNew, tStck, iTop*sizeof(T));             // copy as needed
   if(tStck) delete(tStck); tStck = (T*) NULL; iLen = 0; // free existing
   tStck = ptStckNew; iLen = iNewLen;       // point to new stack
   return(iNewLen);
}

//---Functions----------------------------------
template <class T>
int TEqStack<T>::Push(T t) {
   if(iTop >= iLen) Alloc(iLen + EQSTACK_CHUNK); // allocate some more
   if(iTop >= iLen) return(-1);             // didn't work, return with error
   tStck[iTop] = t;                         // save the value and..
   iTop++;                                  //..increment the counter
   return(iTop);
}

template <class T>
int TEqStack<T>::InsertBack(T t, int iOffs) {
   if(iTop >= iLen) Alloc(iLen + EQSTACK_CHUNK); // allocate some more
   if(iTop >= iLen) return(-1);             // didn't work, return with error
   for(int k=iTop; k>iTop+iOffs; k--) tStck[k]=tStck[k-1];
   tStck[iTop+iOffs] = t;
   iTop++;
   return(iTop);
}

template <class T>
T TEqStack<T>::Pop(void) {
   if(iTop <= 0) return(tNul);              //..in case the stack is empty
   iTop--;                                  // decrement counter and..
   return(tStck[iTop]);                     //..return the value
}

template <class T>
T TEqStack<T>::Peek(void) {
   if(iTop <= 0) return(tNul);
   return(tStck[iTop-1]);                   // return value at top of stack
}

template <class T>
int TEqStack<T>::Top(void) {
   return(iTop);                            // stack valid provided Top() > 0
}

template <class T>
T TEqStack<T>::PeekBack(int iOffs) {     // peek further back (iOffs is negative)
   if((iTop+iOffs) < 0) return(tNul);
   return(tStck[iTop+iOffs]);
}

template <class T>
void TEqStack<T>::Display(const char *pszHead, const char *pszFmt) {
   printf("%s", pszHead);
   for(int k=0; k<iTop; k++) {
      printf("  %d:", k);
      printf(pszFmt, tStck[k]);
   }
   printf("\n");
}

#endif/*CLCEQTN_H*/


