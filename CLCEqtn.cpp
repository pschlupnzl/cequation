/*****************************************************************************
*  CLCEqtn.cpp                                          C�SIVM LaserCanvas
*  Equation class implementation for LaserCanvas Rev. 5
*  Class declaration in LasrCanv.h.
* $PSchlup 2004-2006 $     $Revision 6 $
* Revision History
*    7  2008mar29   Adding units and dimensions
*    6  2008mar22S  Added n-argument operators and assignment (!)
*    5  2006nov18S  Added logical operators
*  4.3  2006oct19   Added ContainsVariable(k)
*  4.2  2004nov     -SetVariableNames, +ParseDoubleEquation
*  4.1  2004nov     Added primitive units support (then removed it again)
*  4.0  2004oct     Adapted for LaserCanvas
*  1.0  2004aug     Initial development
*****************************************************************************/

/*****************************************************************************
* CEquation v1.0                                                   CXEQTN.cpp
******************************************************************************
* A class that parses and evaluates an equation string.  Features operator
* precedence, parentheses, built-in functions, string constants, and evalua-
* tion-time variables.
*
* This version of CEquation calculates real numbers only. Operations that re-
* sult in complex, infinite, or undefined numbers are flagged as errors and
* the evaluation is aborted.
*
* Algorithm
* ---------
* The equation string is internally converted to a reverse-Polish notation
* (RPN) stack of operators, constants, and variables. For example, the string
*       1 + 2 * 3
* is parsed to
*  (1)  1.000
*  (2)      2.000
*  (3)          3.000
*  (4)        *
*  (5)    +
* Constants such as "pi" are expanded at parse-time.
*
* The advantage of converting the equation to an RPN stack is that string pro-
* cessing only needs to be performed once. The evaluation routine
* DoEquation(..) is thus much faster, which makes CEquation more applicable to
* applications where each equation must be evaluated repeatedly.
*
* The source string is stored as-is, and there is as yet no functionality for
* converting the RPN stack back into a string. It is therefore worth checking
* that expressions are parsed correctly. The C�SIVM CEquation Tester is a
* useful tool for verifying the CEquation parsing algorithm.
*
* Errors
* ------
* Errors arising from the string to be parsed, such as incorrect bracket
* matching, unknown variable names, or missing operators or numbers, are re-
* turned by ParseEquation(..). Possible parse errors constants are listed in
* CXEQTN.h and begin with EQERR_PARSE_. Use GetLastError(..) to obtain a des-
* criptive error message and the location of the error in the source string.
*
* Evaluation errors as well as the most common mathematical errors are re-
* turned by DoEquation(..). Possible error constants are listed in CXEQTN.h
* and begin with EQERR_EVAL_ and EQERR_MATH_, respectively. Use
* GetLastError(..) to obtain a descriptive error message and the location of
* the operation that caused the error in the source string.
*
* Rounding errors must be checked by the user application. For example,
*    1 / sin(pi)
* does not result in a division-by-zero error since sin(pi) is not exactly
* zero. For example, on a particular Pentium-3,
*    1e16 * sin(pi) = 1.224606.
*
* For intensive math applications, it is worth providing a custom math error
* handler by defining a function _matherr in one of the source files. See the
* documentation of _matherr for more information.
*
* Variables
* ---------
* To set the names of variables, pass a null-terminated string of null-termi-
* nated strings to SetVariableNames(..). Ensure that there are TWO null char-
* acters at the end of the string. For example, to set variable names "x", "y"
* and "z" (in that order), use SetVariableNames("x\0y\0z\0"). (The second NULL
* character is automatically included at the end of the ".." string constant.)
* It is advisable to check the return value of SetVariableNames(..) to ensure
* the correct number of variables has been parsed.
*
* After calling SetVariableNames(..), ParseEquation(..) must be called to up-
* date the variable name pointer referencing. Failing to re-parse the equation
* can yield incorrect results or memory access violations.
*
* When the equation is evaluated, an array of variable values is passed to
* DoEquation(..). The values for the variables are taken in the same order as
* when the variables were defined.
*
* Usage Example
* -------------
*    CEquation Eq;                          // create a CEquation object
*    double    dVar[2];                     // array of variable values
*    double    dAns;                        // equation answer
*
*    // parse the equation string with variables
*    Eq.ParseEquation("x + sin(pi * y)", "x\0y\0");
*
*    dVar[0] = 5.000;                       // value of "x"
*    dVar[1] = 0.250;                       // value of "y"
*
*    Eq.DoEquation(dVar, &dAns);            // evaluate equation
*    // dAns will now be 5.707107
******************************************************************************/
#include "CLCEqtn.h"                        // header file and definitions


void DisplayValopStack(TEqStack<VALOP> *pStack, const char *pszHead) {
   if(pszHead) printf("%s\n", pszHead);
   for(int k=0; k<pStack->Top(); k++) {
      printf("%d @%d: ", k, pStack->PeekBack(-k-1).iPos);
      switch(pStack->PeekBack(-k-1).uTyp) {
      case VOTYP_UNDEFINED: printf("Undefined\n"); break;
      case VOTYP_VAL:       printf("Value %lg\n",          pStack->PeekBack(-k-1).dVal ); break;
      case VOTYP_OP:        printf("Operator %s\n", OP2STR(pStack->PeekBack(-k-1).uOp )); break;
      case VOTYP_REF:       printf("Variable [%d]\n",      pStack->PeekBack(-k-1).iRef ); break;
      case VOTYP_UNIT:      printf("Unit [%d]\n",          pStack->PeekBack(-k-1).iUnit); break;
      case VOTYP_NARGC:     printf("Argc %d\n",            pStack->PeekBack(-k-1).iArgc); break;
      default: printf("Unknown valop type %d\n",           pStack->PeekBack(-k-1).uTyp ); break;
      }
   }
}
void DisplayOpStack(TEqStack<int> *pStack, const char *pszHead) {
   int uOp;
   if(pszHead) printf("%s\n", pszHead);
   for(int k=0; k<pStack->Top(); k++) {
      uOp = pStack->PeekBack(-k-1);
      printf("%d: % 4d", k, uOp);
      while(uOp>OP_BRACKETOFFSET) uOp -= OP_BRACKETOFFSET;
      printf("=%s\n", OP2STR(uOp));
   }
}
/*********************************************************
*  Constructor and initialization
*********************************************************/
CEquation::CEquation(void) { //printf("CEquation::CEquation\n");
   pszSrcEquation = NULL;                   // no data allocated
   pvoEquation    = NULL;                   // no equation allocated
   iEqnLength     = 0;                      // no ops parsed
   iError         = EQERR_NONE;             // no error occurred
   iErrorLocation = 0;                      // no error location
}

/*********************************************************
*  Destructor
*********************************************************/
CEquation::~CEquation() {
   FreeSrcEquation();                       // free memory buffer
   FreeEquation();                          // free equation stack
//printf("Deleted ~CEquation\n");
}

/*********************************************************
*  GetEquationString
*  Copies the equation string, if it exists, into the
*  specified buffer
*********************************************************/
void CEquation::GetEquationString(char *szBuf, size_t len) {
   if(szBuf==NULL) return;
   if(pszSrcEquation==NULL) { *szBuf = '\0'; return; };
   strncpy(szBuf, pszSrcEquation, len-1);
}

/*********************************************************
*  Answer
*  Executes DoEquation, discards error information and
*  returns the equation result or 0.000 if an error oc-
*  curs.
*********************************************************/
double CEquation::Answer(double dVar[], BOOL tfAllowAssign) {
   double dAns;
   DoEquation(dVar, &dAns, tfAllowAssign);  // execute, sets iError
   if(iError != EQERR_NONE) dAns = 0.000;   // set a default value with error
   return(dAns);                            // return result as requested
}


/*********************************************************
*  Memory for source string
*********************************************************/
//===Allocate=============================================
BOOL CEquation::SetSrcEquation(const char *sz) {
   FreeSrcEquation();                       // free previously allocated
   pszSrcEquation = (char*) malloc((strlen(sz)+1) * sizeof(char)); // allocate new
   if(pszSrcEquation == NULL) return(FALSE); // verify allocation
   strcpy(pszSrcEquation, sz);              // copy the string
   return(TRUE);                            // return success
}

//===Free=================================================
void CEquation::FreeSrcEquation(void) {
   if(pszSrcEquation == NULL) return;
   free(pszSrcEquation);
   pszSrcEquation = NULL;
}

/*********************************************************
*  Memory for VALOP equation stack
*********************************************************/
//===Allocate=============================================
BOOL CEquation::AllocEquation(int iNumOps) {
   FreeEquation();                          // free previously allocated
   pvoEquation = (VALOP*) malloc(iNumOps * sizeof(VALOP));
   return( (pvoEquation!=NULL) ? TRUE : FALSE ); // return success
}

//===Free=================================================
void CEquation::FreeEquation(void) {
   if(pvoEquation == NULL) return;
   free(pvoEquation);
   pvoEquation = NULL;
   iEqnLength = 0;                          // track how long buffer is
}


/*********************************************************
*  ContainsVariables
*  Returns an EQERR_PARSE_CONTAINSVAR if at least one
*  operator is a variable reference.
*  Sets iErrorPosition to point to where the variable
*  occurs in the source equation
*********************************************************/
int CEquation::ContainsVariables(void) {
   int  iThisPt;                            // loop counter

   if(iEqnLength<=0) return(iError=EQERR_PARSE_NOEQUATION); // return if no equation
   for(iThisPt=0; iThisPt<iEqnLength; iThisPt++) {
      if(pvoEquation[iThisPt].uTyp == VOTYP_REF) { // found a ref
         iErrorLocation = pvoEquation[iThisPt].iPos; // point to position
         return(iError=EQERR_PARSE_CONTAINSVAR); // return error set
      }
   }
   return(iError=EQERR_NONE);               // no variables found
}


/*********************************************************
* ContainsVariable
* Returns EQERR_PARSE_CONTAINSVAR if the supplied indexed
* variable is used in the  equation, and sets iErrorPosi-
* tion to the first occurrence in the equation.
* If the variable is not used, returns EQERR_NONE.
*********************************************************/
int CEquation::ContainsVariable(int iVar) {
   int iThisPt;                             // loop counter
   if(iEqnLength<=0) return(0);             // not used if no equation
   for(iThisPt=0; iThisPt<iEqnLength; iThisPt++) {
      if(pvoEquation[iThisPt].uTyp == VOTYP_REF) {         // found a reference
         if(pvoEquation[iThisPt].iRef == iVar) {           // found the queried variable
            iErrorLocation = pvoEquation[iThisPt].iPos;    // point to position in source
            return(iError=EQERR_PARSE_CONTAINSVAR);        // return with error set
         }//if(this variable)
      }//if(a variable)
   }//for(equation)
   return(iError=EQERR_NONE);               // no variable found
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
BOOL CEquation::ContainsUnits(void) {
   int iThisPt;                             // loop counter

   if(iEqnLength<=0) return(FALSE);         // no equation defined
   for(iThisPt=0; iThisPt<iEqnLength; iThisPt++) {
      if(pvoEquation[iThisPt].uTyp == VOTYP_UNIT) { // found a unit
         iErrorLocation = pvoEquation[iThisPt].iPos; // point to position
         return(TRUE);
      }
   }
   return(FALSE);
}

/*********************************************************
*  ParseConstantEquation
*  Examine an equation, returning the same value as Parse-
*  Equation if a parse error occurs or CONTAINSVAR if it
*  contains variables.
*  If parsing succeeds, writes only the answer into the
*  szSrcEquation field.
*  The final answer, if it is a constant, is written to
*  the source string using the SPRINTF format pszFmt. If
*  pszFmt is NULL, the source string is cleared.
* NOTE - DOES NOT HANDLE UNITS!
*********************************************************/
int CEquation::ParseConstantEquation(const char *szEqtn, double *pdAns) {
   double dAns;                             // equation answer

   //---Parse equation--------------------------
   ParseEquation(szEqtn, NULL);             // attempt to parse the equation
   if(iError != EQERR_NONE) return(iError); // flag error if parse fails

   //---Execute equation------------------------
   DoEquation(NULL, &dAns);                 // evaluate equation (returns CONTAINSVAR with NULL array)
   if(iError != EQERR_NONE) return(iError); // flag error on evaluation
   if(pdAns != NULL) *pdAns = dAns;         // return result, if desired

   return(iError);                          // return last error
}


/*********************************************************
*  ParseDoubleEquation                               $4.2$
*  Create a simple equation using only a float value,
*  writing answer using SPRINTF format pszFmt into the
*  source equation. If pszFmt is NULL or omitted, uses "%lg".
*********************************************************/
int CEquation::ParseDoubleEquation(double dVal, const char *pszFmt) {
   char   szBuf[256];                       // temporary string storage

   iError = EQERR_NONE;                     // clear previous errors

   FreeEquation();                          // free equation buffer
   iEqnLength = 1;                          // collapse to just one entry
   AllocEquation(iEqnLength);               // allocate memory
   pvoEquation[0].uTyp = VOTYP_VAL;         // create constant entry..
   pvoEquation[0].dVal = dVal;              //..with equation result
   pvoEquation[0].iPos = 0;                 // point to start of string
   FreeSrcEquation();                       // remove source equation string
   if(pszFmt) {
      _snprintf(szBuf, sizeof(szBuf)-1, pszFmt, dVal); // format as required
   } else {
      _snprintf(szBuf, sizeof(szBuf)-1, "%lg", dVal);
   }
   SetSrcEquation(szBuf);                   // free, allocate, and set
   return(iError);
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
int CEquation::_ParseEquationUnits(const char *_szEqtn, int iThisPt, int iBrktOff, TEqStack<int> &isOps, TEqStack<int> &isPos, TEqStack<VALOP> &vosParsEqn, UINT uLookFor) {
   int   iThisScan;                         // advance this scan location
   char *pszSt;                             // offset into character arrays
   int   iTokLen;                           // token length
   int   iPrfx;                             // prefix index
   int   iUnit;                             // loop counter
   int   iThisOp;                           // unit multiplier
   VALOP voThisValop;                       // value/operator to push onto stack

   iThisScan =  0;                          // found no unit yet
   iPrfx     = -1;                          // no prefix yet

   //---Get token length------------------------
   for(iTokLen=1; (iThisPt+iTokLen<(int)strlen(_szEqtn)) && strchr(EQ_VALIDUNIT, _szEqtn[iThisPt+iTokLen]); iTokLen++);
   if(iTokLen<=0) return(0);                // ignore bad token

   //---Scan for Unit---------------------------
   do {                                     // search twice: once with and then without prefix
      pszSt = (char*) CEquationSIUnitStr;      // start at beginning of string
      for(iUnit = 0; iUnit < EQSI_NUMUNIT_INPUT; iUnit++) {
         if( strncmp(_szEqtn+iThisPt, pszSt, MAX((int)strlen(pszSt), iTokLen)) == 0 ) {
            //---hanging---
            if(uLookFor == LOOKFOR_NUMBER) {
               iThisOp = isOps.Peek(); while(iThisOp > OP_BRACKETOFFSET) iThisOp -= OP_BRACKETOFFSET;
               switch(iThisOp) {
               case OP_DIV:                 // hanging / --> add "1"
                  voThisValop.uTyp = VOTYP_PREFIX; // scale factor
                  voThisValop.dVal = 1.00;
                  voThisValop.iPos = iThisPt;
                  vosParsEqn.Push(voThisValop); // push scale factor
                  iBrktOff += OP_BRACKETOFFSET; // higher precedence
                  break;
               case OP_MUL:                 // after "*" not needed
                  isOps.Pop();              // remove the multiplication
                  isPos.Pop();
                  break;
               default:                     // everything else is an error
                  iError = EQERR_PARSE_NUMBEREXPECTED;
                  return(0);
               }
            } else {
               iThisOp = iBrktOff + OP_BRACKETOFFSET; // do everthing higher than me
               _ProcessOps(&vosParsEqn, &isOps, &isPos, iThisOp, iBrktOff);
            }

            //---prefix---
            if(iPrfx>=0) {
               if(iError != EQERR_NONE) return(0);
               voThisValop.uTyp = VOTYP_PREFIX; // scale factor
               voThisValop.dVal = CEquationSIUnitPrefix[iPrfx];
               voThisValop.iPos = iThisPt;
               vosParsEqn.Push(voThisValop); // push scale factor
               isOps.Push(OP_MUL + iBrktOff);
               isPos.Push(iThisPt);
            }

            //---unit---
            iThisOp = isOps.Peek(); while(iThisOp>OP_BRACKETOFFSET) iThisOp-=OP_BRACKETOFFSET;
            iThisOp = OP_MUL + iBrktOff + (iThisOp==OP_DIV)*OP_BRACKETOFFSET;
            voThisValop.uTyp  = VOTYP_UNIT;
            voThisValop.iUnit = iUnit;
            voThisValop.iPos  = iThisPt;       // store const's position
            vosParsEqn.Push(voThisValop);      // save this const*/
            _ProcessOps(&vosParsEqn, &isOps, &isPos, iThisOp, iBrktOff);
            iThisScan = strlen(pszSt) + ((iPrfx>=0) ? 1 : 0); // length of this scan
            iPrfx = -9999;                     // stop searching prefixes
            break;                             // stop looking
         }
         pszSt += strlen(pszSt) + 1;           // advance to next part in string
      }
      if(iPrfx <= -9999) break;

      //---Scan for prefix-------------------------
      for(iPrfx=0; iPrfx<EQSI_NUMUNIT_PREFIX; iPrfx++)
         if(CEquationSIUnitPrefixStr[iPrfx] == _szEqtn[iThisPt]) break;
      if(iPrfx >= EQSI_NUMUNIT_PREFIX) break; // skip if not found
      iThisPt++;                            // start back up one
      iTokLen--;                            // string is one char longer
   } while(1);
   return(iThisScan);
}

/*********************************************************
* Parse equation
* Return value is an error code
*********************************************************/
#pragma warn -csu                           // ignore warnings of comparisons between signed iThisPt and unsigned strlen(.)
int CEquation::ParseEquation(const char *_szEqtn, const char *pszVars) {
   TEqStack<int>   isPos;                   // stack of operator positions
   TEqStack<int>   isOps;                   // stack of pending operations
   TEqStack<VALOP> vosParsEqn;              // RPN stack of parsed equation
   UINT   uLookFor;                         // parse status, next token
   int    iThisPt;                          // index into source string
   int    iThisScan;                        // advance in this scan
   double dThisVal;                         // numeric value
   int    iTokLen;                          // length of this token (ops, variables)
   int    iThisOp;                          // current binary operator
   int    iPrevOp;                          // previous binary op on stack
   int    iUnOp;                            // unary operator / loop counter
   int    iNArgOp;                          // n-arg operator / loop counter
   int    iCnst;                            // constant / loop counter
   int    iVrbl;                            // variable / loop counter
   char  *pszSt;                            // offset into character arrays
   char   cChar;                            // char buffer for binary op
   int    iBrktOff;                         // bracket offset
   VALOP  voThisValop;                      // value/operator for stack

   //===Parse Equation====================================
   memset(&m_uUnitTarget, 0x00, sizeof(m_uUnitTarget));
   memset(&m_szUnit     , 0x00, sizeof(m_szUnit));
   m_dScleTarget = 0.00;                    // target scaling (used as flag!)
   m_dOffsTarget = 0.00;                    // target offset

   iThisPt  = 0;                            // scan from start of buffer
   iBrktOff = 0;                            // no bracket offset
   iError   = EQERR_NONE;                   // no error
   uLookFor = LOOKFOR_NUMBER;               // start by looking for a number

   while((iThisPt < strlen(_szEqtn)) && (iError==EQERR_NONE)) {
      while(_szEqtn[iThisPt] == ' ') iThisPt++; // skip blank chars
      if(iThisPt >= strlen(_szEqtn)) break; // end of equation reached
      if(strchr(EQ_ILLEGALCHAR, _szEqtn[iThisPt]) != NULL) {
         iError = EQERR_PARSE_ILLEGALCHAR;
         break;
      }
      iThisScan = 0;                        // scan length of this step

      switch(uLookFor) {
      //----------------------------------------
      //   Number
      //----------------------------------------
      case LOOKFOR_NUMBER:
         //---Function, constant, or variable---
         if(strchr(EQ_VALIDCHAR, _szEqtn[iThisPt]) != NULL) {
            //---tokenize---
            iTokLen = 1;
            while((iThisPt+iTokLen < strlen(_szEqtn))
                  && (strchr(EQ_VALIDSYMB, _szEqtn[iThisPt+iTokLen]) != NULL)) {
               iTokLen++;
            }

            //---variables---
            // scan first to allow overloading
            // NOTE - does not remove lead/trail spaces!
            if(pszVars != NULL) {
               pszSt = (char*) pszVars;     // start looking at start of string
               iVrbl = 0;                   // start counting up variables
               while(*pszSt != NULL) {      // stop on double-NULL termination
                  if( strncmp(_szEqtn+iThisPt, pszSt, MAX(strlen(pszSt), iTokLen)) == 0 ) {
                     voThisValop.uTyp = VOTYP_REF;
                     voThisValop.iRef = iVrbl;
                     voThisValop.iPos = iThisPt;  // store variable's position
                     vosParsEqn.Push(voThisValop);// save this variable
                     iThisScan = strlen(pszSt);   // length of this scan
                     uLookFor = LOOKFOR_BINARYOP; // look for binary operator next
                     break;
                  }
                  pszSt += strlen(pszSt) + 1;  // advance to next part in string..
                  iVrbl ++;                    //..and track index into array
               }
               if(uLookFor==LOOKFOR_BINARYOP) break;// break out if already found variable
            }

            //---dimensioned constant---
            pszSt = (char*) CEquationSIUnitConstStr; // start at beginning of string
            for(iCnst = 0; iCnst < EQSI_NUMCONST; iCnst++) {
               if( strncmp(_szEqtn+iThisPt, pszSt, MAX(strlen(pszSt), iTokLen)) == 0 ) {
                  voThisValop.uTyp = VOTYP_VAL;
                  voThisValop.dVal = CEquationSIConst[iCnst];
                  voThisValop.iPos = iThisPt;  // store const's position
                  vosParsEqn.Push(voThisValop);// save this const
                  if(CEquationSIConstUnitIndx[iCnst] >= 0) {
                     voThisValop.uTyp  = VOTYP_UNIT;
                     voThisValop.iUnit = CEquationSIConstUnitIndx[iCnst];
                     voThisValop.iPos  = iThisPt;
                     vosParsEqn.Push(voThisValop); // store unit multiplier
                  }
                  iThisScan = strlen(pszSt);   // length of this scan
                  uLookFor = LOOKFOR_BINARYOP; // look for binary operator next
                  break;                       // stop looking
               }
               pszSt += strlen(pszSt) + 1;  // advance to next part in string
            }
            if(iCnst < EQSI_NUMCONST) break; // break out if already found constant


            //---unary---
            // Scan for unary operators using CEquationUnaryOpStr
            pszSt = (char*) CEquationUnaryOpStr; // start at beginning of string
            for(iUnOp = 0; iUnOp < NUM_UNARYOP; iUnOp++) {
               if( strncmp(_szEqtn+iThisPt, pszSt, MAX(strlen(pszSt), iTokLen)) == 0 ) {
                  isPos.Push(iThisPt);         // store the operator's position
                  isOps.Push(OP_UNARY + iUnOp + iBrktOff); // save this op
                  iThisScan = iTokLen;         // length of this token
                  uLookFor = LOOKFOR_BRACKET;  // look for opening bracket next
                  break;
               }
               pszSt += strlen(pszSt) + 1;  // advance to next part in string
            }
            if(iUnOp < NUM_UNARYOP) break;  // break out if already found op

            //---n-arg---
            pszSt = (char*) CEquationNArgOpStr; // start at beginning of string
            for(iNArgOp=0; iNArgOp<NUM_NARGOP; iNArgOp++) {
               if( strncmp(_szEqtn+iThisPt, pszSt, MAX(strlen(pszSt), iTokLen)) == 0) {
                  isPos.Push(iThisPt);      // store this position
                  isOps.Push(OP_NARG + iNArgOp + iBrktOff); // save this op
                  iThisScan = iTokLen;      // length of this token
                  uLookFor = LOOKFOR_BRACKET; // look for opening bracket
                  break;
               }
               pszSt += strlen(pszSt) + 1;  // advance to next string identifier
            }
            if(iNArgOp < NUM_NARGOP) break; // break out if found n-arg op

            //---hanging unit---
            iThisScan = _ParseEquationUnits(_szEqtn, iThisPt, iBrktOff, isOps, isPos, vosParsEqn, uLookFor);
            if(iThisScan > 0) { uLookFor = LOOKFOR_BINARYOP; break; }

            iError = EQERR_PARSE_UNKNOWNFUNCVAR;

         //---Negative sign---
         // For sho':  -2^2 = -4 according to Matlab, so - sign must be
         // processed before scanning for a number here
         } else if(_szEqtn[iThisPt] == '-') {
            voThisValop.uTyp = VOTYP_VAL;
            voThisValop.dVal = -1.0000;
            voThisValop.iPos = iThisPt;
            vosParsEqn.Push(voThisValop);
            isOps.Push(OP_MUL + iBrktOff);
            isPos.Push(iThisPt);
            iThisScan = 1;                  // size of this token
            uLookFor  = LOOKFOR_NUMBER;     // look for number again

         //---Positive sign---
         } else if(_szEqtn[iThisPt] == '+') {
            // nop
            iThisScan = 1;
            uLookFor  = LOOKFOR_NUMBER;     // look for number again

         //---Number---
         } else if(sscanf(_szEqtn+iThisPt,  // find a number
               "%lg%n", &dThisVal, &iThisScan) > 0) {
            voThisValop.uTyp = VOTYP_VAL;
            voThisValop.dVal = dThisVal;
            voThisValop.iPos = iThisPt;
            vosParsEqn.Push(voThisValop);
            // iThisScan from sscanf above
            uLookFor = LOOKFOR_BINARYOP;    // look for binary operator next

         //---Bracket---
         } else if(_szEqtn[iThisPt] == '(') {
            iBrktOff += OP_BRACKETOFFSET;   // increment nested brackets
            iThisScan = 1;                  // size of this token
            uLookFor  = LOOKFOR_NUMBER;     // look for number again

         //---Fall-through error---
         } else {
            iError = EQERR_PARSE_NUMBEREXPECTED;
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
      case LOOKFOR_BINARYOP:
         cChar = _szEqtn[iThisPt];   // get current character
         switch(cChar) {
         //---Built-in operators---
         case '+': case '-': case '*': case '/': case '^':
         case '<': case '>': case '!': case '=': case '|': case '&':
         case ',':
            iThisOp = OP_NULL;
                 if(strncmp(&_szEqtn[iThisPt], "," , 1)==0) { iThisOp = OP_PSH; iThisScan = 1; }
            else if(strncmp(&_szEqtn[iThisPt], "+" , 1)==0) { iThisOp = OP_ADD; iThisScan = 1; }
            else if(strncmp(&_szEqtn[iThisPt], "-" , 1)==0) { iThisOp = OP_SUB; iThisScan = 1; }
            else if(strncmp(&_szEqtn[iThisPt], "*" , 1)==0) { iThisOp = OP_MUL; iThisScan = 1; }
            else if(strncmp(&_szEqtn[iThisPt], "/" , 1)==0) { iThisOp = OP_DIV; iThisScan = 1; }
            else if(strncmp(&_szEqtn[iThisPt], "^" , 1)==0) { iThisOp = OP_POW; iThisScan = 1; }
            else if(strncmp(&_szEqtn[iThisPt], "||", 2)==0) { iThisOp = OP_OR;  iThisScan = 2; }
            else if(strncmp(&_szEqtn[iThisPt], "&&", 2)==0) { iThisOp = OP_AND; iThisScan = 2; }
            else if(strncmp(&_szEqtn[iThisPt], "|" , 1)==0) { iThisOp = OP_OR;  iThisScan = 1; }
            else if(strncmp(&_szEqtn[iThisPt], "&" , 1)==0) { iThisOp = OP_AND; iThisScan = 1; }
            else if(strncmp(&_szEqtn[iThisPt], "<=", 2)==0) { iThisOp = OP_LTE; iThisScan = 2; }
            else if(strncmp(&_szEqtn[iThisPt], ">=", 2)==0) { iThisOp = OP_GTE; iThisScan = 2; }
            else if(strncmp(&_szEqtn[iThisPt], "<" , 1)==0) { iThisOp = OP_LT;  iThisScan = 1; }
            else if(strncmp(&_szEqtn[iThisPt], ">" , 1)==0) { iThisOp = OP_GT;  iThisScan = 1; }
            else if(strncmp(&_szEqtn[iThisPt], "!=", 2)==0) { iThisOp = OP_NEQ; iThisScan = 2; }
            else if(strncmp(&_szEqtn[iThisPt], "==", 2)==0) { iThisOp = OP_EQ;  iThisScan = 2; }
            else if(strncmp(&_szEqtn[iThisPt], "=" , 1)==0) { iThisOp = OP_SET; iThisScan = 1; }
            if(iThisOp==OP_NULL) {          // problems scanning operator
               iError = EQERR_PARSE_BINARYOPEXPECTED;
               break;                       // break out of loop with error
            }

            //---Assignment---------------------
            if(iThisOp == OP_SET) {
               voThisValop = vosParsEqn.Peek();
               if(voThisValop.uTyp != VOTYP_REF) { iError = EQERR_PARSE_ASSIGNNOTVAR; iThisPt--; break; }
               voThisValop = vosParsEqn.Pop();   // remove variable ref from stack
               isOps.Push(voThisValop.iRef);     // store reference as "operator"
               isPos.Push(voThisValop.iPos);     // source string location
            }

            //---Push / Pops--------------------
            // Commas, when not used  in conjunction with
            // multi-argument operators, remove the first
            // argument and retain the second.
            if(iThisOp == OP_PSH) {
               if(iBrktOff<=0) iThisOp = OP_POP;
               iCnst = 0;                   // look back to find if multi-arg
               do {
                  iNArgOp = isOps.PeekBack(--iCnst);
                  if(iNArgOp <= iBrktOff) break;
                  while(iNArgOp > OP_BRACKETOFFSET) iNArgOp -= OP_BRACKETOFFSET;
                  if((iNArgOp>=OP_NARG) && (iNArgOp<OP_NARG+NUM_NARGOP)
                     && (CEquationNArgOpArgc[iNArgOp-OP_NARG]<0)) iCnst--; // skip vari-arg count
                  if(iNArgOp==OP_SET) iCnst--; // skip assignment variable reference
               } while(1);
               if( (iNArgOp-iBrktOff+OP_BRACKETOFFSET==0)
                  || (iNArgOp < iBrktOff-OP_BRACKETOFFSET+OP_BINARYMIN) )
                  iThisOp = OP_POP;
            }
            //---Process------------------------
            iThisOp += iBrktOff;            // offset for brackets
            iError = _ProcessOps(&vosParsEqn, &isOps, &isPos, iThisOp, iBrktOff);

            //---Push This Op-------------------
            isOps.Push(iThisOp);
            isPos.Push(iThisPt);
            uLookFor  = LOOKFOR_NUMBER;     // look for number again
            break;

         //---Closing bracket---
         // In order  to allow multi-argument  operators, we
         // need to record the number of  arguments at parse
         // time---the RPN stack has no knowledge of bracket
         // levels when the equation is evaluated.
         case ')':
            iCnst = iVrbl = 0;              // iCnst=loop counter, iVrbl counts OP_PSH
            do {
               iNArgOp = isOps.PeekBack(--iCnst);
               if(iNArgOp <= iBrktOff) break;
               if((iNArgOp-iBrktOff) == OP_PSH) iVrbl++; // count OP_PSH instances
               while(iNArgOp > OP_BRACKETOFFSET) iNArgOp -= OP_BRACKETOFFSET;
               if((iNArgOp>=OP_NARG) && (iNArgOp<OP_NARG+NUM_NARGOP)
                  && (CEquationNArgOpArgc[iNArgOp-OP_NARG]<0)) iCnst--; // skip vari-arg count
               if(iNArgOp==OP_SET) iCnst--; // skip assignment variable reference
            } while(1);

            iBrktOff -= OP_BRACKETOFFSET;   // go up one bracket level
            if(iBrktOff < 0) iError = EQERR_PARSE_UNOPENEDBRACKET;
            else iThisScan = 1;             // size of this token
            uLookFor  = LOOKFOR_BINARYOP;   // continue looking for binary op

            iNArgOp -= iBrktOff + OP_NARG;  // offset to n-arg operators
            iVrbl   += 1;                   // there's one more argument that PUSHes
            if((iNArgOp>=0) && (iNArgOp<NUM_NARGOP)) { // n-arg operators
               if((iVrbl < ABS(CEquationNArgOpArgc[iNArgOp]))
                  || ((CEquationNArgOpArgc[iNArgOp]>0) && (iVrbl>CEquationNArgOpArgc[iNArgOp]))) {
                  iThisPt = isPos.PeekBack(iCnst) - 1;
                  iError = EQERR_PARSE_NARGBADCOUNT; // wrong number of args
                  break;
               }
               if(CEquationNArgOpArgc[iNArgOp] < 0) {
                  isOps.InsertBack(iVrbl, iCnst);
                  isPos.InsertBack(isPos.PeekBack(iCnst), iCnst);
               }
            } else {                        // single-arg op
               if(iVrbl > 1) {
                  iThisPt = isPos.PeekBack(iCnst) - 1;
                  iError = EQERR_PARSE_NARGBADCOUNT;
                  break;
               }
            }
            break;

            //---Units----------------
         default:
            iThisScan = _ParseEquationUnits(_szEqtn, iThisPt, iBrktOff, isOps, isPos, vosParsEqn, uLookFor);
            if(iThisScan > 0) { uLookFor = LOOKFOR_BINARYOP; break; }

            //---Target unit----------
            if(_szEqtn[iThisPt] == '#') {
               iThisPt++;                   // skip past delimiter sign
               iError = _StringToUnit(_szEqtn+iThisPt, m_szUnit, sizeof(m_szUnit),
                  &m_uUnitTarget, &m_dScleTarget, &m_dOffsTarget);
               if(iError != EQERR_NONE) iThisPt += iErrorLocation; // shift error into string
               else iThisPt = strlen(_szEqtn); // this should be last on line
               iThisScan = 1;
            } else {
               iError = EQERR_PARSE_BINARYOPEXPECTED;
            }

            break;
         }//switch
         break;

      //----------------------------------------
      //   Bracket -(-
      //----------------------------------------
      case LOOKFOR_BRACKET:
         if( _szEqtn[iThisPt] == '(') {
            iBrktOff += OP_BRACKETOFFSET;   // increment nested brackets
            iThisScan = 1;                  // size of this token
            uLookFor  = LOOKFOR_NUMBER;     // look for number again
         } else {
            iError = EQERR_PARSE_BRACKETEXPECTED;
         }
         break;

      }//switch
      if((iThisScan==0) && (iError==EQERR_NONE)) iError = EQERR_PARSE_NOADVANCE;
      iThisPt += iThisScan;                 // advance to start of next token
   }//while


   //===Error handling====================================
   //---Parse completion errors-----------------
   do {
      iErrorLocation = iThisPt;             // store where error occurred (if it did)
      if(iError != EQERR_NONE) break;       // retain first error
      if(iBrktOff > 0)              { iError = EQERR_PARSE_BRACKETSOPEN;    break; }
      if(uLookFor==LOOKFOR_BRACKET) { iError = EQERR_PARSE_BRACKETEXPECTED; break; }
      if(uLookFor==LOOKFOR_NUMBER)  { iError = EQERR_PARSE_NUMBEREXPECTED;  break; }

      //---Finish pushing operators-------------
      iThisOp = -1;                         // push all remaining operators
      iError = _ProcessOps(&vosParsEqn, &isOps, &isPos, iThisOp, iBrktOff);
   } while(0);

   //---Error Location--------------------------
   if(iError != EQERR_NONE) return(iError); // return with error code


   //===Save finished equation============================
   SetSrcEquation(_szEqtn);                 // free, allocate, set string
   if(pszSrcEquation==NULL) return(iError=EQERR_PARSE_ALLOCFAIL); // quit on alloc fail

   // Skip OP_PSH, they don't do anything at evaluation time
   for(iCnst=0,iThisOp=vosParsEqn.Top(); iThisOp>0; iThisOp--) {
      voThisValop = vosParsEqn.PeekBack(-iThisOp-1);
      if((voThisValop.uTyp == VOTYP_OP) && (voThisValop.uOp == OP_PSH)) continue;
      iCnst++;
   }
   AllocEquation(iCnst);                    // free and allocate

   if(pvoEquation == NULL) return(iError=EQERR_PARSE_ALLOCFAIL); // quit on alloc fail
   iEqnLength = iCnst;
   for(iThisPt = iEqnLength-1; iThisPt >= 0; iThisPt--) { // copy stack (reverse order)
      voThisValop = vosParsEqn.Pop();
      while((voThisValop.uTyp == VOTYP_OP) && (voThisValop.uOp == OP_PSH)) voThisValop = vosParsEqn.Pop();
      pvoEquation[iThisPt] = voThisValop;
   }
   return(iError=EQERR_NONE);
}

/*********************************************************
* _StringToUnit                                   Private
*********************************************************/
int CEquation::_StringToUnit(const char *_szEqtnOffset, char *pszUnitOut, int iLen, UNITBASE *pUnit, double *pdScale, double *pdOffset) {
   char     szUnitOut[256];                 // formatted local text
   double   dScale, dOffset;                // local values
   UNITBASE uUnit;                          // local unit assembly
   UNITBASE uUnitCur;                       // current unit
   double   dPwrCur;                        // current scaling power
   double   dSclCur;                        // current scale factor
   char    *pszEqtn;                        // pointer into equation
   char    *psz;                            // loop pointer into unit
   double   dVal;                           // scanned value
   int      iUnit;                          // unit loop counter
   int      iBase;                          // base unit loop counter
   int      iSign;                          // sign, top or bottom
   int      iPrfx;                          // flag that unit is found
   int      iTokLen;                        // token length

   //===Preliminaries=====================================
   memset(szUnitOut, 0x00, sizeof(szUnitOut)); // clear buffer
   for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++)
      uUnitCur.d[iBase] = uUnit.d[iBase] = 0.00; // clear unit arrays
   iError   = EQERR_NONE;                   // default, no error
   iErrorLocation = 0;                      // just in case this becomes important
   dScale   = 1.00;                         // no scaling
   dOffset  = 0.00;                         // no offset
   iSign    = +1;                           // start on numerator
   dSclCur  = 1.00;                         // current scale factor
   dPwrCur  = 1.00;                         // current scaling power
   iUnit    = -1;                           // no unit to apply
   pszEqtn  = (char*) _szEqtnOffset;        // start at beginning of string

   if(strlen(_szEqtnOffset) <= 0) { iError = EQERR_PARSE_UNITEXPECTED; iErrorLocation = 0; return(iError); }
   while(*pszEqtn==' ') pszEqtn++;          // skip whitespace
   if(*pszEqtn=='1') pszEqtn++;             // skip "1" in "1/" or "1mm"

   //===Scan Each Unit====================================
   do {
      //---Apply current------------------------
      if(iUnit>=0) {
         for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) {
            uUnit.d[iBase] += iSign * dPwrCur * uUnitCur.d[iBase]; // apply current unit
            uUnitCur.d[iBase] = CEquationSIUnit[iUnit][iBase]; // new base unit scaling
         }
         if(iSign>0) dScale  *= pow(dSclCur, dPwrCur); else dScale  /= pow(dSclCur, dPwrCur);
         dSclCur = dPwrCur = 1.00;
      }

      //---Skip whitespace----------------------
      while(*pszEqtn == ' ') pszEqtn++;     // skip any whitespace
      if(*pszEqtn == '\0') break;           // exit when at end of string
      if((strlen(szUnitOut)>0) && (szUnitOut[strlen(szUnitOut)-1]!='/'))
         sprintf(szUnitOut+strlen(szUnitOut), " "); // add space between units on output

      //---Solidus------------------------------
      if(*pszEqtn == '/') {
         if(iSign < 1) { iError = EQERR_PARSE_ILLEGALCHAR; break; } // don't allow double-solidus
         sprintf(szUnitOut+strlen(szUnitOut), "/"); // print solidus to output
         iUnit = -1;                        // don't apply unit next time
         iSign = -1; pszEqtn++; continue;   // at first occurrence, switch to denominator
      }

      //---Unit---------------------------------
      iPrfx = -1;                           // haven't searched for prefix yet
      iTokLen=0; while(pszEqtn[iTokLen] && strchr(EQ_VALIDUNIT, pszEqtn[iTokLen])) iTokLen++;

      do {
         for(psz=(char*)CEquationSIUnitStr, iUnit=0; iUnit<EQSI_NUMUNIT_INPUT; iUnit++, psz+=strlen(psz)+1) {
            if(strncmp(pszEqtn, psz, MAX(iTokLen, strlen(psz))) == 0) {
               //---Scale and Offset---
               if( ((CEquationSIUnit[iUnit][EQSI_NUMUNIT_BASE] != 1.00) && (dOffset != 0.00)) // don't allow offsets on pre-scaled
                  || ((CEquationSIUnit[iUnit][EQSI_NUMUNIT_BASE+1] != 0.00) && (dScale != 1.00)) // don't combine scales and offsets
                  || ((CEquationSIUnit[iUnit][EQSI_NUMUNIT_BASE+1] != 0.00) && (iSign < 0)) // don't allow offsets in denominator
                  ) {
                  iError = EQERR_PARSE_UNITINCOMPATIBLE; break;
               }
               for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) {
                  uUnitCur.d[iBase] = CEquationSIUnit[iUnit][iBase]; // new base unit scaling
               }
               dSclCur *= CEquationSIUnit[iUnit][EQSI_NUMUNIT_BASE];
               dOffset += CEquationSIUnit[iUnit][EQSI_NUMUNIT_BASE+1];

               //---Format---
               sprintf(szUnitOut+strlen(szUnitOut), "%s", psz); // print this unit to output
               pszEqtn += strlen(psz);
               iPrfx = -999;                // indicate unit was found
               break;
            }//if(matched)
         }//for(unit)
         if((iPrfx <= -999) || (iError!=EQERR_NONE)) break; // continue out of loop once unit found
         if((iPrfx >= 0) || (iTokLen <= 1)) { iError = EQERR_PARSE_UNITEXPECTED; break; }

         //---Prefix----------------------------
         for(iPrfx=0; iPrfx<EQSI_NUMUNIT_PREFIX; iPrfx++) {
            if(*pszEqtn == CEquationSIUnitPrefixStr[iPrfx]) {
               dSclCur *= CEquationSIUnitPrefix[iPrfx];
               sprintf(szUnitOut+strlen(szUnitOut), "%c", CEquationSIUnitPrefixStr[iPrfx]);
               pszEqtn++; iTokLen--;
               break;
            }
         }
         if(iPrfx >= EQSI_NUMUNIT_PREFIX) { iError = EQERR_PARSE_UNITEXPECTED; break; }
         while(*pszEqtn == ' ') pszEqtn++;  // skip whitespace
      } while(iError == EQERR_NONE); // try again, with prefix second time

      //---Power--------------------------------
      while(*pszEqtn == ' ') pszEqtn++;     // skip whitespace
      if(sscanf(pszEqtn, "%lg", &dVal) > 0) {   // found a power
         if((dVal < 0.00) && (iSign < 0)) { iError = EQERR_PARSE_UNITEXPECTED; break; } // don't allow kg/m-1
         if(dOffset != 0.00) { iError = EQERR_PARSE_UNITINCOMPATIBLE; break; } // don't allow degF^2
         dPwrCur = dVal;
         sprintf(szUnitOut+strlen(szUnitOut), "%lg", dPwrCur);
         while(*pszEqtn && strchr("-+0123456789", *pszEqtn)) pszEqtn++; // skip number
      }
   } while(iError == EQERR_NONE);

   //---Check ending----------------------------
   if(szUnitOut[strlen(szUnitOut)-1] == '/') iError = EQERR_PARSE_UNITEXPECTED;

   //===Finalize==========================================
   if(iError != EQERR_NONE) iErrorLocation = pszEqtn - _szEqtnOffset; // distance into string
   if(pszUnitOut) strncpy(pszUnitOut, szUnitOut, iLen);
   if(pUnit) for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) pUnit->d[iBase] = uUnit.d[iBase];
   if(pdScale ) *pdScale  = dScale;
   if(pdOffset) *pdOffset = dOffset;

   return(iError);
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
int CEquation::_ProcessOps(TEqStack<VALOP> *pvosParsEqn, TEqStack<int> *pisOps, TEqStack<int> *pisPos, int iThisOp, int iBrktOff) {
   int   iPrevOp;                           // previous operator on stack
   VALOP voThisValop;                       // structure element added to equation stack

   do {
      if(pisOps->Top() <= 0) break;         // exit when stack is empty
      iPrevOp = pisOps->Peek();             // examine previous operation
      //---Relational-------
      if(iPrevOp < iThisOp) {               // check lower-priority
         if(   (iPrevOp<OP_RELOPMIN) || (iPrevOp>OP_RELOPMAX) // unless both relops, ..
            || (iThisOp<OP_RELOPMIN) || (iThisOp>OP_RELOPMAX) ) break; //..exit on lower precedence
      }
      if((iThisOp==OP_PSH+iBrktOff) && (iPrevOp==iThisOp)) break; // retain multi argument push

      //---Previous op------
      iPrevOp = pisOps->Pop();              // get previous operation
      while(iPrevOp >= OP_BRACKETOFFSET) iPrevOp -= OP_BRACKETOFFSET; // strip bracket levels
      voThisValop.uTyp = VOTYP_OP;          // operator type
      voThisValop.uOp  = iPrevOp;           // operation
      voThisValop.iPos = pisPos->Pop();     // source string location
      if( pvosParsEqn->Push(voThisValop) <0) {// store this operator in stack
         iErrorLocation = voThisValop.iPos; // operator that caused overflow
         return(EQERR_PARSE_STACKOVERFLOW); // check for stack overflow
      }
      //---Set--------------
      if(iPrevOp == OP_SET) {
         voThisValop.uTyp = VOTYP_REF;      // variable reference comes next
         voThisValop.iRef = pisOps->Pop();  // variable ref earlier stored as "operator"
         voThisValop.iPos = pisPos->Pop();  // source string location
         if( pvosParsEqn->Push(voThisValop) <0) { // store reference right after op
            iErrorLocation = voThisValop.iPos; // operator that caused overflow
            return(EQERR_PARSE_STACKOVERFLOW); // check for stack overflow
         }
      }

      //---Variable-arg-----
      iPrevOp -= OP_NARG;                   // offset to check for multi-arg op
      if((iPrevOp>=0) && (iPrevOp<NUM_NARGOP) && CEquationNArgOpArgc[iPrevOp]<0) {
         voThisValop.uTyp  = VOTYP_NARGC;   // argument count type
         voThisValop.iArgc = pisOps->Pop(); // arg count was earlier stored as "operator"
         voThisValop.iPos  = pisPos->Pop(); // source string location
         if( pvosParsEqn->Push(voThisValop) <0) {// store argument count right after op
            iErrorLocation = voThisValop.iPos; // operator that caused overflow
            return(EQERR_PARSE_STACKOVERFLOW); // check for stack overflow
         }
      }
   } while(1);                              // repeat until finished
   return(EQERR_NONE);
}


/*********************************************************
*  DoEquation
*  Perform calculation, using the variables given
*  The answer is placed in dpAns, the return value is an
*  error code
*********************************************************/
#define M_PI_180  0.01745329251994
#define M_180_PI 57.29577951308232
int CEquation::DoEquation(double dVar[], double *pdAns, BOOL tfAllowAssign, BOOL tfAllowDerived) {
   TEqStack<double> dsVals;                 // RPN stack of values
   TEqStack<UNITBASE> usUnits;              // RPN stack of unit factors
   VALOP    voThisValop;                    // token being processed
   int      iThisPt;                        // pointer into equation
   int      iArg;                           // multi-arg loop counter
   int      iBase;                          // units checking loop counter
   UNITBASE uUnitZero;                      // zeros unit block for convenience
   UNITBASE uUnit;                          // result unit
   UNITBASE uUnit1;                         // argument 1 unit
   UNITBASE uUnit2;                         // argument 2 unit
   double   dVal;                           // result value
   double   dArg1;                          // argument 1 value
   double   dArg2;                          // argument 2 value
   char    *psz;                            // unit loop pointer

   if(iEqnLength <= 0) return(iError=EQERR_EVAL_NOEQUATION);
   memset(&uUnitZero, 0x00, sizeof(UNITBASE));

   iError = EQERR_NONE;                     // no error
   for(iThisPt=0; iThisPt<iEqnLength && iError==EQERR_NONE; iThisPt++) {
      voThisValop = pvoEquation[iThisPt];

      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // Simple Cases
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      switch(voThisValop.uTyp) {
      //===Store a value==================================
      case VOTYP_VAL:
      case VOTYP_PREFIX:
         dsVals.Push(voThisValop.dVal); usUnits.Push(uUnitZero);
         break;

      //===Variable=======================================
      case VOTYP_REF:
         if(dVar==NULL) {
            dsVals.Push(0.000);
            usUnits.Push(uUnitZero);
            iError = EQERR_EVAL_CONTAINSVAR;
         }
         dsVals.Push( dVar[voThisValop.iRef] ); // save variable value
///TODO: Variables with units!
         usUnits.Push(uUnitZero);
         break;

      //===Units==========================================
      case VOTYP_UNIT:
         uUnit = usUnits.Pop();             // get last unit
         for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++)
            uUnit.d[iBase] += CEquationSIUnit[voThisValop.iUnit][iBase];
         usUnits.Push(uUnit);               // push multiplied unit
         dVal = dsVals.Pop();
         dVal =      CEquationSIUnit[voThisValop.iUnit][EQSI_NUMUNIT_BASE+1] // offset
            + dVal * CEquationSIUnit[voThisValop.iUnit][EQSI_NUMUNIT_BASE]; // scale
         dsVals.Push(dVal);
         break;

      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // Operators
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      case VOTYP_OP:
         //===Assignment Operator=========================
         if(voThisValop.uOp == OP_SET) {
            if((dVar==NULL) || (tfAllowAssign==FALSE)) { iError = EQERR_EVAL_ASSIGNNOTALLOWED; break; }
            if(dsVals.Top() < 1) { iError = EQERR_EVAL_STACKUNDERFLOW; break; }
            iThisPt++;                      // get variable reference from next
            if(iThisPt>=iEqnLength) { iError = EQERR_EVAL_STACKUNDERFLOW; break; }
            if(pvoEquation[iThisPt].uTyp != VOTYP_REF) { iError = EQERR_EVAL_BADTOKEN; break; }
            dVar[pvoEquation[iThisPt].iRef] = dsVals.Peek(); // assign (leave in stack)
            break;
         }

         //===Binary Operators============================
         // These now also include unit checking.
         if(voThisValop.uOp < OP_UNARY) {
            if(dsVals.Top() < 2) iError = EQERR_EVAL_STACKUNDERFLOW;
            dArg2 = dsVals.Pop(); uUnit2 = usUnits.Pop(); // get second and..
            dArg1 = dsVals.Pop(); uUnit1 = usUnits.Pop(); //..first arguments of op

            //---Check easy math errors---------
            switch(voThisValop.uOp) {
            case OP_DIV: if (dArg2==0) {dArg2 = 1.00; iError = EQERR_MATH_DIV_ZERO; } break;
            case OP_POW:
               if(dArg1<0.00) dArg2 = floor(dArg2+0.50); // prevent fractions on negatives
               if((dArg1==0.00)&&(dArg2<0.00)){dArg1 = 1.00; iError = EQERR_MATH_DIV_ZERO; }
               break;
            }

            //---Check Units--------------------
            switch(voThisValop.uOp) {
            case OP_ADD:  case OP_SUB:
            case OP_OR:   case OP_AND:
            case OP_LTE:  case OP_GTE:
            case OP_LT:   case OP_GT :
            case OP_NEQ:  case OP_EQ :
               for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (uUnit1.d[iBase]==uUnit2.d[iBase]); iBase++);
               if(iBase < EQSI_NUMUNIT_BASE) {
                  iError = EQERR_EVAL_UNITMISMATCH; // mismatch triggers error
               }
               else switch(voThisValop.uOp) {
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
            case OP_MUL: for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) uUnit.d[iBase] = uUnit1.d[iBase] + uUnit2.d[iBase]; break;
            case OP_DIV: for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) uUnit.d[iBase] = uUnit1.d[iBase] - uUnit2.d[iBase]; break;

            case OP_POW:
               for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (uUnit2.d[iBase]==0.00); iBase++)
                  uUnit.d[iBase] = uUnit1.d[iBase] * dArg2; // argument factors up as power
               if(iBase < EQSI_NUMUNIT_BASE) iError = EQERR_EVAL_UNITNOTDIMLESS;
               break;
            }

            //---Perform Op---------------------
            switch(voThisValop.uOp) {
            case OP_PSH: dsVals.Push(dArg1); usUnits.Push(uUnit1); dVal = dArg2; uUnit = uUnit2; break; // restore both to stack
            case OP_POP:  dVal = dArg2; uUnit = uUnit2; break; // ignore first argument
            case OP_ADD:  dVal = dArg1 + dArg2; break;
            case OP_SUB:  dVal = dArg1 - dArg2; break;
            case OP_MUL:  dVal = dArg1 * dArg2; break;
            case OP_DIV:  dVal = dArg1 / dArg2; break;
            case OP_POW:  dVal = ((dArg1==0.00) && (dArg2==0.00)) ? 1.00 : pow(dArg1, dArg2); break;
            case OP_OR:   dVal = ((dArg1!=0.00) || (dArg2!=0.00)) ? 1.00 : 0.00; break;
            case OP_AND:  dVal = ((dArg1!=0.00) && (dArg2!=0.00)) ? 1.00 : 0.00; break;
            case OP_LTE:  dVal = (dArg1 <= dArg2) ? 1.00 : 0.00; break;
            case OP_GTE:  dVal = (dArg1 >= dArg2) ? 1.00 : 0.00; break;
            case OP_LT :  dVal = (dArg1 <  dArg2) ? 1.00 : 0.00; break;
            case OP_GT :  dVal = (dArg1 >  dArg2) ? 1.00 : 0.00; break;
            case OP_NEQ:  dVal = (dArg1 != dArg2) ? 1.00 : 0.00; break;
            case OP_EQ :  dVal = (dArg1 == dArg2) ? 1.00 : 0.00; break;
            default: iError = EQERR_EVAL_UNKNOWNBINARYOP;
            }

         //===Unary Operators=============================
         } else if(voThisValop.uOp < OP_NARG) {
            if(dsVals.Top() < 1) iError = EQERR_EVAL_STACKUNDERFLOW;
            dArg1 = dsVals.Pop(); uUnit = usUnits.Pop(); // single function argument

            switch(voThisValop.uOp - OP_UNARY) {
            //---Primitive Limits Checking----------------
            case OP_ACOS: if(fabs(dArg1) > 1.00) { dArg1 = 0.00; iError = EQERR_MATH_DOMAIN; }  break;
            case OP_ASIN: if(fabs(dArg1) > 1.00) { dArg1 = 0.00; iError = EQERR_MATH_DOMAIN; }  break;
            case OP_LOG10:if(dArg1==0.00)        { dArg1 = 1.00; iError = EQERR_MATH_LOG_ZERO; }
                          if(dArg1< 0.00)        { dArg1 = 1.00; iError = EQERR_MATH_LOG_NEG; } break;
            case OP_LOG:  if(dArg1==0.00)        { dArg1 = 1.00; iError = EQERR_MATH_LOG_ZERO; }
                          if(dArg1< 0.00)        { dArg1 = 1.00; iError = EQERR_MATH_LOG_NEG; } break;
            case OP_SQRT: if(dArg1<0.00)         { dArg1 = 0.00; iError = EQERR_MATH_SQRT_NEG; } break;
            case OP_EXP:  if(dArg1>709.00)       { dArg1 = 0.00; iError = EQERR_MATH_OVERFLOW; } break;
            }

            //---Units------------------------------------
            switch(voThisValop.uOp - OP_UNARY) {
            //---same---
            case OP_ABS:
            case OP_CEIL:
            case OP_FLOOR:
            case OP_ROUND:
               break;

            //---power---
            case OP_SQRT: for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) uUnit.d[iBase] *= 0.50; break;

            //---dimless---
            case OP_EXP:
            case OP_LOG10:
            case OP_LOG:
            case OP_COS:
            case OP_SIN:
            case OP_TAN:
            case OP_ACOS:
            case OP_ASIN:
            case OP_ATAN:
            case OP_COSH:
            case OP_SINH:
            case OP_TANH:
            case OP_SIND:
            case OP_COSD:
            case OP_TAND:
            case OP_ASIND:
            case OP_ACOSD:
            case OP_ATAND:
            case OP_NOT:
            case OP_SIGN:
               for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (uUnit.d[iBase]==0.00); iBase++);
               if(iBase < EQSI_NUMUNIT_BASE) iError = EQERR_EVAL_UNITNOTDIMLESS;
               break;
            }

            //---Evaluate---------------------------------
            switch(voThisValop.uOp - OP_UNARY) {
            case OP_ABS:   dVal = fabs(dArg1);  break;
            case OP_SQRT:  dVal = sqrt(dArg1);  break;
            case OP_EXP:   dVal = exp(dArg1);   break;
            case OP_LOG10: dVal = log10(dArg1); break;
            case OP_LOG:   dVal = log(dArg1);   break;
            case OP_CEIL:  dVal = ceil(dArg1);  break;
            case OP_FLOOR: dVal = floor(dArg1); break;
            case OP_ROUND: dVal = floor(dArg1+0.500); break;
            case OP_COS:   dVal = cos(dArg1);   break;
            case OP_SIN:   dVal = sin(dArg1);   break;
            case OP_TAN:   dVal = tan(dArg1);   break;
            case OP_ACOS:  dVal = acos(dArg1);  break;
            case OP_ASIN:  dVal = asin(dArg1);  break;
            case OP_ATAN:  dVal = atan(dArg1);  break;
            case OP_COSH:  dVal = cosh(dArg1);  break;
            case OP_SINH:  dVal = sinh(dArg1);  break;
            case OP_TANH:  dVal = tanh(dArg1);  break;
            case OP_SIND:  dVal = sin(dArg1 * M_PI_180); break;
            case OP_COSD:  dVal = cos(dArg1 * M_PI_180); break;
            case OP_TAND:  dVal = tan(dArg1 * M_PI_180); break;
            case OP_ASIND: dVal = M_180_PI * asin(dArg1); break;
            case OP_ACOSD: dVal = M_180_PI * acos(dArg1); break;
            case OP_ATAND: dVal = M_180_PI * atan(dArg1); break;
            case OP_NOT:   dVal = (dArg1==0.00) ? 1.00 : 0.00; break;
            case OP_SIGN:  dVal = (dArg1==0.00) ? 0.00 : (dArg1<0.00) ? -1.00 : 1.00; break;
            default: iError = EQERR_EVAL_UNKNOWNUNARYOP;
            }

         //===N-Argument Operators========================
         } else {
            if(dsVals.Top() < ABS(CEquationNArgOpArgc[voThisValop.uOp-OP_NARG])) iError = EQERR_EVAL_STACKUNDERFLOW;
            //---2-Argument---------------------
            if(CEquationNArgOpArgc[voThisValop.uOp-OP_NARG]==2) {
               dArg2 = dsVals.Pop(); uUnit2 = usUnits.Pop();
               dArg1 = dsVals.Pop(); uUnit1 = usUnits.Pop();

               switch(voThisValop.uOp - OP_NARG) {
               case OP_NARG_MOD:            // see Matlab's definitions..
               case OP_NARG_REM:            //..of MOD and REM!
                  if(dArg2==0.00) {
                     if((voThisValop.uOp-OP_NARG)==OP_NARG_MOD) dVal = dArg1;
                     else iError = EQERR_MATH_DIV_ZERO;
                     break;
                  }

                  for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (uUnit1.d[iBase]==uUnit2.d[iBase]); iBase++); // units must match
                  if(iBase<EQSI_NUMUNIT_BASE) iError = EQERR_EVAL_UNITMISMATCH; else uUnit = uUnit2; // answer has same units

                  dVal = dArg1 - dArg2*floor(dArg1/dArg2);
                  if((voThisValop.uOp-OP_NARG) == OP_NARG_REM) {
                     if(SIGN(dArg1) != SIGN(dArg2)) dVal -= dArg2;
                  }
                  break;

               case OP_NARG_ATAN2:
               case OP_NARG_ATAN2D:
                  for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (uUnit1.d[iBase]==uUnit2.d[iBase]); iBase++); // units must match
                  if(iBase<EQSI_NUMUNIT_BASE) iError = EQERR_EVAL_UNITMISMATCH; else uUnit = uUnitZero; // answer is dimensionless

                  dVal = (dArg2==0.00) ?
                     ((dArg1==0.00) ? 0.00 : ((dArg1>0.00) ? M_PI/2.00 : -M_PI/2.00))
                     : atan2(dArg1, dArg2);
                  if((voThisValop.uOp-OP_NARG)==OP_NARG_ATAN2D) dVal *= M_180_PI;
                  break;

               default: iError = EQERR_EVAL_UNKNOWNNARGOP;
               }
            //---Variable-Argument--------------
            } else if(CEquationNArgOpArgc[voThisValop.uOp-OP_NARG]<0) {
               iThisPt++;
               if(iThisPt>=iEqnLength) { iError = EQERR_EVAL_STACKUNDERFLOW; break; }
               if(pvoEquation[iThisPt].uTyp != VOTYP_NARGC) { iError = EQERR_EVAL_UNKNOWNNARGOP; break; }
               switch(voThisValop.uOp - OP_NARG) {
               case OP_NARG_MAX:
               case OP_NARG_MIN:
                  dVal = dsVals.Pop(); uUnit = usUnits.Pop();
                  for(iArg=1; iArg<pvoEquation[iThisPt].iArgc; iArg++) {
                     dArg1 = dsVals.Pop(); uUnit1 = usUnits.Pop();

                     for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (uUnit1.d[iBase]==uUnit.d[iBase]); iBase++);
                     if(iBase<EQSI_NUMUNIT_BASE) iError = EQERR_EVAL_UNITMISMATCH; // units must match

                     switch(voThisValop.uOp - OP_NARG) {
                     case OP_NARG_MAX: if(dArg1 > dVal) dVal = dArg1; break;
                     case OP_NARG_MIN: if(dArg1 < dVal) dVal = dArg1; break;
                     }
                  }
                  break;

               default: iError = EQERR_EVAL_UNKNOWNNARGOP;
               }
            //---Remaining N-Argument-----------
            } else {
               switch(voThisValop.uOp - OP_NARG) {
               case OP_NARG_IF:
                  dArg2 = dsVals.Pop(); uUnit2 = usUnits.Pop(); // value-if-false
                  dArg1 = dsVals.Pop(); uUnit1 = usUnits.Pop(); // value-if-true
                  dVal  = dsVals.Pop(); uUnit  = usUnits.Pop(); // conditional test
                  for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (uUnit.d[iBase]==0.00); iBase++); // units must match
                  if(iBase<EQSI_NUMUNIT_BASE) iError = EQERR_EVAL_UNITNOTDIMLESS;
                  uUnit = (dVal==0.00) ? uUnit2 : uUnit1;
                  dVal  = (dVal==0.00) ? dArg2  : dArg1;
                  break;
               default: iError = EQERR_EVAL_UNKNOWNNARGOP;
               }
            }
         }//if
         dsVals.Push(dVal); usUnits.Push(uUnit); // store operation result on stack
         break;

      //---Fall-through error-------------------
      default:
         iError = EQERR_EVAL_UNKNOWNVALOP;
         break;
      }//switch
   }//for

   //===Error handling====================================
   if((iError==EQERR_NONE) && (dsVals.Top() > 1)) iError = EQERR_EVAL_STACKNOTEMPTY;
   if(iError != EQERR_NONE) {
      iErrorLocation = (iThisPt-1 < iEqnLength) ? // store where processing failed..
            pvoEquation[iThisPt-1].iPos : 0;
      return(iError);                       //..and return with error
   }

   //===Final Answer======================================
   dVal = dsVals.Pop(); uUnit = usUnits.Pop(); // last value is answer

   //---Unit Specified------
   if(m_dScleTarget != 0.00) {              // dScle gets set to at least 1.0 on custom
      //---dimensions check---
      for(iBase=0; (iBase<EQSI_NUMUNIT_BASE) && (m_uUnitTarget.d[iBase]==uUnit.d[iBase]); iBase++);
      if(iBase < EQSI_NUMUNIT_BASE) {       // dimensions check
//printf("\nResult:"); for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) printf(" %lg ", uUnit.d[iBase]);
//printf("\nTarget:"); for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) printf(" %lg ", m_uUnitTarget.d[iBase]);
         iErrorLocation = strlen(pszSrcEquation);
         return(iError = EQERR_EVAL_UNITMISMATCH);
      }
      //---apply---
      dVal = (dVal - m_dOffsTarget) / m_dScleTarget;

   //---Not spec'd-------
   } else {
      _AnswerUnitString(&dVal, &uUnit, tfAllowDerived);   // convert answer with units
   }

   if(pdAns) *pdAns = dVal;
   return(iError=EQERR_NONE);               // return OK flag
}


/*********************************************************
*  GetLastError
*  Returns the character position where the error occurred,
*  and prints a description of the error into the buffer
*  supplied
*********************************************************/
int CEquation::GetLastError(char *szBuffer, size_t len) {
   strncpy(szBuffer,
      (iError==EQERR_NONE)                   ? "No error" :

      (iError==EQERR_PARSE_ALLOCFAIL)        ? "Could not allocate buffer" :
      (iError==EQERR_PARSE_NOEQUATION)       ? "Equation not defined" :

      (iError==EQERR_PARSE_NUMBEREXPECTED)   ? "Number, function, or variable expected" :
      (iError==EQERR_PARSE_UNKNOWNFUNCVAR)   ? "Unknown function or variable" :
      (iError==EQERR_PARSE_BRACKETEXPECTED)  ? "Bracket -(- expected" :
      (iError==EQERR_PARSE_BINARYOPEXPECTED) ? "Binary operator expected" :
      (iError==EQERR_PARSE_UNOPENEDBRACKET)  ? "Too many -)- brackets" :
      (iError==EQERR_PARSE_BRACKETSOPEN)     ? "Missing -)- brackets(s)" :
      (iError==EQERR_PARSE_NOADVANCE)        ? "No advance at token" :
      (iError==EQERR_PARSE_CONTAINSVAR)      ? "Constant expression expected" :
      (iError==EQERR_PARSE_NARGBADCOUNT)     ? "Function has wrong number of arguments" :
      (iError==EQERR_PARSE_STACKOVERFLOW)    ? "Parse stack overflow" :
      (iError==EQERR_PARSE_ASSIGNNOTVAR)     ? "Assignment must be to valid variable" :
      (iError==EQERR_PARSE_UNITEXPECTED)     ? "Unit expected" :
      (iError==EQERR_PARSE_UNITALREADYDEF)   ? "Result unit already defined" :
      (iError==EQERR_PARSE_UNITINCOMPATIBLE) ? "Incompatible unit" :
      (iError==EQERR_PARSE_ILLEGALCHAR)      ? "Illegal character" :

      (iError==EQERR_EVAL_UNKNOWNBINARYOP)   ? "Unknown binary operator" :
      (iError==EQERR_EVAL_UNKNOWNUNARYOP)    ? "Unknown unary operator" :
      (iError==EQERR_EVAL_UNKNOWNNARGOP)     ? "Unknown n-argument operator" :
      (iError==EQERR_EVAL_UNKNOWNVALOP)      ? "Corrupted command - unknown valop":
      (iError==EQERR_EVAL_STACKNOTEMPTY)     ? "Corrupted value stack - not empty" :
      (iError==EQERR_EVAL_STACKUNDERFLOW)    ? "Value stack underflow" :
      (iError==EQERR_EVAL_CONTAINSVAR)       ? "Variable(s) not supplied" :
      (iError==EQERR_EVAL_BADTOKEN)          ? "Unexpected token type" :
      (iError==EQERR_EVAL_ASSIGNNOTALLOWED)  ? "Assignment not allowed" :
      (iError==EQERR_EVAL_UNITMISMATCH)      ? "Incompatible units" :
      (iError==EQERR_EVAL_UNITNOTDIMLESS)    ? "Dimensionless argument expected" :
      (iError==EQERR_EVAL_NOEQUATION)        ? "No equation to evaluate" :

      (iError==EQERR_MATH_DIV_ZERO)          ? "Division by zero" :
      (iError==EQERR_MATH_DOMAIN)            ? "Domain error" :
      (iError==EQERR_MATH_SQRT_NEG)          ? "Square root of negative number" :
      (iError==EQERR_MATH_LOG_ZERO)          ? "Log of zero" :
      (iError==EQERR_MATH_LOG_NEG)           ? "Log of negative number" :
      (iError==EQERR_MATH_OVERFLOW)          ? "Overflow" :
      "Unknown error", len);
   return(iErrorLocation);
}


/*********************************************************
*  LastErrorMessage
*  Prepares a string with the last error
*  Since the equation source string isn't saved until
*  parsing succeeds, must pass the failed source equation
*  string for PARSE errors
*********************************************************/
void CEquation::LastErrorMessage(char *szBuffer, size_t len, const char *szSource) {
   int iErrPs;                              // scan to end of unknown variable

   _snprintf(szBuffer, len, "Equation error: ");
   if(strlen(szBuffer) >= len-1) return;    // quit now if string too short

   switch(iError) {
   case EQERR_NONE:
   case EQERR_PARSE_ALLOCFAIL:
   case EQERR_PARSE_NOEQUATION:
      GetLastError(szBuffer+strlen(szBuffer), len-strlen(szBuffer)); // simple errors: Last error message
      return;

   case EQERR_PARSE_NUMBEREXPECTED:
   case EQERR_PARSE_BRACKETEXPECTED:
   case EQERR_PARSE_BINARYOPEXPECTED:
   case EQERR_PARSE_BRACKETSOPEN:
   case EQERR_PARSE_UNOPENEDBRACKET:
   case EQERR_PARSE_NOADVANCE:
   case EQERR_PARSE_CONTAINSVAR:
   case EQERR_PARSE_ILLEGALCHAR:
      if(szSource == NULL) break;           // parse error: need failed source
      _snprintf(szBuffer+strlen(szBuffer), len-strlen(szBuffer), "%s%.*s <-- ",
         (iErrorLocation>16) ? "..." : "",  // leading ellipsis
         MIN(iErrorLocation+1, 16),           // at most 16 chars
         szSource+MAX(0, iErrorLocation-16)); // some of string
      break;

   case EQERR_PARSE_UNKNOWNFUNCVAR:         // want to show whole variable name
      if(szSource == NULL) break;
      for(iErrPs=iErrorLocation; (szSource[iErrPs]!='\0') && (strchr(EQ_VALIDSYMB, szSource[iErrPs])!=0); iErrPs++);
      _snprintf(szBuffer+strlen(szBuffer), len-strlen(szBuffer), "%s%.*s <-- ",
         (iErrorLocation>16) ? "..." : "",  // leading ellipsis
         MIN(iErrorLocation, 16) + iErrPs-iErrorLocation, // at most 16 chars plus string
         szSource+MAX(0, iErrorLocation-16));       // some of string
      break;

   case EQERR_EVAL_UNKNOWNBINARYOP:
   case EQERR_EVAL_UNKNOWNUNARYOP:
   case EQERR_EVAL_UNKNOWNVALOP:
   case EQERR_EVAL_STACKNOTEMPTY:
   case EQERR_EVAL_STACKUNDERFLOW:
   case EQERR_EVAL_CONTAINSVAR:
   case EQERR_EVAL_NOEQUATION:
   case EQERR_MATH_DIV_ZERO:
   case EQERR_MATH_DOMAIN:
   case EQERR_MATH_SQRT_NEG:
   case EQERR_MATH_LOG_ZERO:
   case EQERR_MATH_LOG_NEG:
   case EQERR_MATH_OVERFLOW:
      _snprintf(szBuffer+strlen(szBuffer), len-strlen(szBuffer), "%s%.*s <-- ",
         (iErrorLocation>16) ? "..." : "",  // leading ellipsis
         MIN(iErrorLocation, 16),           // at most 16 chars
         pszSrcEquation+MAX(0, iErrorLocation-16)); // some of string
      break;
   }

   if(strlen(szBuffer) < len-1) {
      GetLastError(szBuffer+strlen(szBuffer), len-strlen(szBuffer));
   }
}

/*********************************************************
*  LastErrorMessageBox
*  Displays a MessageBox with the last error, suitably
*  confusingly formatted onto a new line to illustrate
*  the error
*  Let's try to assemble the string buffer while preventing
*  potential overflows
*********************************************************/
/*void CEquation::LastErrorMessageBox(HWND hWnd, const char *szTitle) {
   char szMessage[256];                     // message text
   int  iStrt, iEnd;                        // indices into source eqtn quote

   //---Intro text------------------------------
   switch(iError) {
   case EQERR_NONE:
      return;

   case EQERR_PARSE_ALLOCFAIL:
   case EQERR_PARSE_NOEQUATION:
      sprintf(szMessage, "Error parsing equation:\n");
      break;
   case EQERR_PARSE_NUMBEREXPECTED:
   case EQERR_PARSE_UNKNOWNFUNCVAR:
   case EQERR_PARSE_BRACKETEXPECTED:
   case EQERR_PARSE_BINARYOPEXPECTED:
   case EQERR_PARSE_UNOPENEDBRACKET:
   case EQERR_PARSE_BRACKETSOPEN:
   case EQERR_PARSE_NOADVANCE:
   case EQERR_PARSE_CONTAINSVAR:
   case EQERR_PARSE_ILLEGALCHAR:
      sprintf(szMessage, "Equation parse error:\n");
      break;

   case EQERR_EVAL_UNKNOWNBINARYOP:
   case EQERR_EVAL_UNKNOWNUNARYOP:
   case EQERR_EVAL_UNKNOWNVALOP:
   case EQERR_EVAL_STACKNOTEMPTY:
   case EQERR_EVAL_STACKUNDERFLOW:
   case EQERR_EVAL_CONTAINSVAR:
   case EQERR_EVAL_NOEQUATION:
      // These shouldn't happen anyway
      sprintf(szMessage, "Equation evaluation error:\n");
      break;

   case EQERR_MATH_DIV_ZERO:
   case EQERR_MATH_DOMAIN:
   case EQERR_MATH_SQRT_NEG:
   case EQERR_MATH_LOG_ZERO:
   case EQERR_MATH_LOG_NEG:
   case EQERR_MATH_OVERFLOW:
      sprintf(szMessage, "Equation math error:\n");
      break;

   default:
      sprintf(szMessage, "Unknown error\n");
   }

   //---Formula---------------------------------
   if(pszSrcEquation != NULL) {
      iStrt = iErrorLocation - 32;          // limit how much of the source..
      iEnd  = iErrorLocation + 32;          //..equation will be displayed
      if(iStrt < 0) {
         iStrt = 0;
      } else {                              // include extension markers if necessary
         sprintf(szMessage+strlen(szMessage), "...");
      }
      sprintf(szMessage+strlen(szMessage), "%.*s\n-->   ",
            iErrorLocation-iStrt, pszSrcEquation+iStrt);
      if(iEnd > strlen(pszSrcEquation)) {
         sprintf(szMessage+strlen(szMessage), "%s\n", pszSrcEquation+iErrorLocation);
      } else {
         sprintf(szMessage+strlen(szMessage), "%.*s...\n",
               iEnd-iErrorLocation, pszSrcEquation+iErrorLocation);
      }
   }//if(pszSrcEquation)

   GetLastError(szMessage+strlen(szMessage), sizeof(szMessage)-strlen(szMessage));
   MessageBox(hWnd, szMessage, szTitle, MB_OK|MB_ICONEXCLAMATION);
}
*/



/*********************************************************
* AnswerUnitString                                Private
* If pdVal is supplied, searches for prefixes that make
* the value better and replaces the value there.
* This APPENDS to the string already in m_szUnit to al-
* llow target unit processing
*********************************************************/
void CEquation::_AnswerUnitString(double *pdVal, UNITBASE *puUnit, BOOL tfAllowDerived) {
   double ddUnit[EQSI_NUMUNIT_BASE];        // scaled powers for matched unit
   int    iUnit;                            // matching unit loop counter
   int    iMaxUnit;                         // end point for matching unit
   int    iBase;                            // base unit loop counter
   int    k;                                // loop counter
   int    iNum;                             // number of units used
   double dVal;                             // temporary value
   double dPwr;                             // total absolute power
   double dScl;                             // power scale factor
   int    iNumUnitMin;                      // number of units for best-formatted case
   int    indxUnitMin;                      // starting matched unit index for best formatting
   double dPwrUnitMin;                      // smallest powers raised
   double dSclUnitMin;                      // power factor for best formatted
   char  *psz;                              // pointer into units string

   //---Preliminaries---------------------------
   for(iNum=iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) {
      ddUnit[iBase] = puUnit->d[iBase];     // copy from input
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
   iMaxUnit = (tfAllowDerived) ? EQSI_NUMUNIT : EQSI_NUMUNIT_BASE; // allow / disallow derived

   for(iUnit=0; iUnit<iMaxUnit; iUnit++) {
      for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) {
         //---Scale factor---
         if((ddUnit[iBase]==0.00) || (CEquationSIUnit[iUnit][iBase]==0.00)) continue; // this base unit not used
         dScl = ddUnit[iBase] / CEquationSIUnit[iUnit][iBase]; // scale power by this unit

         //---Number used---
         dPwr = ABS(dScl);                  // matched unit power
         iNum = 1;                          // matched unit coun
         for(k=0; k<EQSI_NUMUNIT_BASE; k++) { // iNum=1: The matched unit counts as one
            if(k==iBase) continue;          // don't double-count base units
            dVal = ddUnit[k] - (dScl*CEquationSIUnit[iUnit][k]); // check match
            if(dVal == 0.00) continue;      // if exactly matches, don't include this base unit
            iNum++;                         // otherwise we have to keep this base unit
            dPwr += ceil(ABS(dVal));        // count powers used
            if(dVal - floor(dVal) != 0.00) dPwr+=10; // penalize fractional powers
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
   if(indxUnitMin >= 0) {
      for(iBase=0; iBase<EQSI_NUMUNIT_BASE; iBase++) // offset matched unit powers
         ddUnit[iBase] -= dSclUnitMin*CEquationSIUnit[indxUnitMin][iBase];
   }

   //===Format Unit=======================================
   for(k=1; k>=-1; k-=2) {                  // repeat for top and bottom lines
      //---Solidus---
      if(k==-1) sprintf(m_szUnit+strlen(m_szUnit), "/");

      //---Matched---
      if((indxUnitMin >= 0) & (SIGN(dSclUnitMin)==k)) {
         for(psz=(char*)CEquationSIUnitStr, iUnit=0; iUnit<indxUnitMin; psz+=strlen(psz)+1, iUnit++);
         sprintf(m_szUnit+strlen(m_szUnit), "%s", psz); // append matched unit
         if(fabs(dSclUnitMin) != 1.00) sprintf(m_szUnit+strlen(m_szUnit), "%g", k*dSclUnitMin);
      }

      //---Base---
      for(psz=(char*)CEquationSIUnitStr, iBase=0; iBase<EQSI_NUMUNIT_BASE; psz+=strlen(psz)+1, iBase++) {
         if(k*ddUnit[iBase] <= 0.00) continue; // this base unit not used
         if((strlen(m_szUnit)>0) && (m_szUnit[strlen(m_szUnit)-1]!='/')) sprintf(m_szUnit+strlen(m_szUnit), " ");
         sprintf(m_szUnit+strlen(m_szUnit), "%s", psz);
         if(k*ddUnit[iBase] != 1.00) sprintf(m_szUnit+strlen(m_szUnit), "%g", k*ddUnit[iBase]);
      }
   }
   if(m_szUnit[strlen(m_szUnit)-1] == '/') m_szUnit[strlen(m_szUnit)-1] = '\0'; // truncate unused trailing solidus

}





