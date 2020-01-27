(function (CEquation) {
    "use strict"

    const OP = CEquation.OP;
    const VOTYP = CEquation.VOTYP;
    const M_PI_180 = CEquation.M_PI_180;
    const M_180_PI = CEquation.M_180_PI;
    const assert = CEquation.utils.assert;
    const assertEqual = CEquation.utils.assertEqual;

    const testCases = [
        {
            eq: "1 + 2", ans: { value: 3 },
            tokens: [
                { typ: VOTYP.VAL, value: 1, pos: 0 },
                { typ: VOTYP.VAL, value: 2, pos: 4 },
                { typ: VOTYP.OP, op: OP.ADD, pos: 2 }
            ]
        },
        {
            eq: "    1 + 2*3.5e2", ans: { value: 701 },
            tokens: [
                { typ: VOTYP.VAL, value: 1, pos: 4 },
                { typ: VOTYP.VAL, value: 2, pos: 8 },
                { typ: VOTYP.VAL, value: 3.5e2, pos: 10 },
                { typ: VOTYP.OP, op: OP.MUL, pos: 9 },
                { typ: VOTYP.OP, op: OP.ADD, pos: 6 }
            ]
        },

        // Simple operators.
        { eq: "10 + 5", ans: { value: 10 + 5 }, tokens: [{ typ: VOTYP.VAL, value: 10, pos: 0 }, {typ: VOTYP.VAL, value: 5, pos: 5 }, { typ: VOTYP.OP, op: OP.ADD, pos: 3 }]},
        { eq: "10 - 5", ans: { value: 10 - 5 }, tokens: [{ typ: VOTYP.VAL, value: 10, pos: 0 }, {typ: VOTYP.VAL, value: 5, pos: 5 }, { typ: VOTYP.OP, op: OP.SUB, pos: 3 }]},
        { eq: "10 * 5", ans: { value: 10 * 5 }, tokens: [{ typ: VOTYP.VAL, value: 10, pos: 0 }, {typ: VOTYP.VAL, value: 5, pos: 5 }, { typ: VOTYP.OP, op: OP.MUL, pos: 3 }]},
        { eq: "10 / 5", ans: { value: 10 / 5 }, tokens: [{ typ: VOTYP.VAL, value: 10, pos: 0 }, {typ: VOTYP.VAL, value: 5, pos: 5 }, { typ: VOTYP.OP, op: OP.DIV, pos: 3 }]},
        { eq: "10 ^ 5", ans: { value: 100000 }, tokens: [{ typ: VOTYP.VAL, value: 10, pos: 0 }, {typ: VOTYP.VAL, value: 5, pos: 5 }, { typ: VOTYP.OP, op: OP.POW, pos: 3 }]},
        { eq: "10 <  5 ", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value: 10, pos: 0 }, {typ: VOTYP.VAL, value:  5, pos: 6 }, { typ: VOTYP.OP, op: OP.LT, pos: 3 }]},
        { eq: "5  <  10", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value:  5, pos: 0 }, {typ: VOTYP.VAL, value: 10, pos: 6 }, { typ: VOTYP.OP, op: OP.LT, pos: 3 }]},
        { eq: "5  <  5 ", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value:  5, pos: 0 }, {typ: VOTYP.VAL, value:  5, pos: 6 }, { typ: VOTYP.OP, op: OP.LT, pos: 3 }]},
        { eq: "10 <= 5 ", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value: 10, pos: 0 }, {typ: VOTYP.VAL, value:  5, pos: 6 }, { typ: VOTYP.OP, op: OP.LTE, pos: 3 }]},
        { eq: "5  <= 10", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value:  5, pos: 0 }, {typ: VOTYP.VAL, value: 10, pos: 6 }, { typ: VOTYP.OP, op: OP.LTE, pos: 3 }]},
        { eq: "5  <= 5 ", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value:  5, pos: 0 }, {typ: VOTYP.VAL, value:  5, pos: 6 }, { typ: VOTYP.OP, op: OP.LTE, pos: 3 }]},
        { eq: "10 >  5 ", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value: 10, pos: 0 }, {typ: VOTYP.VAL, value:  5, pos: 6 }, { typ: VOTYP.OP, op: OP.GT, pos: 3 }]},
        { eq: "5  >  10", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value:  5, pos: 0 }, {typ: VOTYP.VAL, value: 10, pos: 6 }, { typ: VOTYP.OP, op: OP.GT, pos: 3 }]},
        { eq: "5  >  5 ", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value:  5, pos: 0 }, {typ: VOTYP.VAL, value:  5, pos: 6 }, { typ: VOTYP.OP, op: OP.GT, pos: 3 }]},
        { eq: "10 >= 5 ", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value: 10, pos: 0 }, {typ: VOTYP.VAL, value:  5, pos: 6 }, { typ: VOTYP.OP, op: OP.GTE, pos: 3 }]},
        { eq: "5  >= 10", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value:  5, pos: 0 }, {typ: VOTYP.VAL, value: 10, pos: 6 }, { typ: VOTYP.OP, op: OP.GTE, pos: 3 }]},
        { eq: "5  >= 5 ", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value:  5, pos: 0 }, {typ: VOTYP.VAL, value:  5, pos: 6 }, { typ: VOTYP.OP, op: OP.GTE, pos: 3 }]},
        { eq: "0 || 0", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value: 0, pos: 0 }, {typ: VOTYP.VAL, value: 0, pos: 5 }, { typ: VOTYP.OP, op: OP.OR, pos: 2 }]},
        { eq: "0 || 1", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value: 0, pos: 0 }, {typ: VOTYP.VAL, value: 1, pos: 5 }, { typ: VOTYP.OP, op: OP.OR, pos: 2 }]},
        { eq: "1 || 0", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value: 1, pos: 0 }, {typ: VOTYP.VAL, value: 0, pos: 5 }, { typ: VOTYP.OP, op: OP.OR, pos: 2 }]},
        { eq: "1 || 1", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value: 1, pos: 0 }, {typ: VOTYP.VAL, value: 1, pos: 5 }, { typ: VOTYP.OP, op: OP.OR, pos: 2 }]},
        { eq: "0 && 0", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value: 0, pos: 0 }, {typ: VOTYP.VAL, value: 0, pos: 5 }, { typ: VOTYP.OP, op: OP.AND, pos: 2 }]},
        { eq: "0 && 1", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value: 0, pos: 0 }, {typ: VOTYP.VAL, value: 1, pos: 5 }, { typ: VOTYP.OP, op: OP.AND, pos: 2 }]},
        { eq: "1 && 0", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value: 1, pos: 0 }, {typ: VOTYP.VAL, value: 0, pos: 5 }, { typ: VOTYP.OP, op: OP.AND, pos: 2 }]},
        { eq: "1 && 1", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value: 1, pos: 0 }, {typ: VOTYP.VAL, value: 1, pos: 5 }, { typ: VOTYP.OP, op: OP.AND, pos: 2 }]},
        { eq: "0 != 0", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value: 0, pos: 0 }, {typ: VOTYP.VAL, value: 0, pos: 5 }, { typ: VOTYP.OP, op: OP.NEQ, pos: 2 }]},
        { eq: "0 != 1", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value: 0, pos: 0 }, {typ: VOTYP.VAL, value: 1, pos: 5 }, { typ: VOTYP.OP, op: OP.NEQ, pos: 2 }]},
        { eq: "1 != 0", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value: 1, pos: 0 }, {typ: VOTYP.VAL, value: 0, pos: 5 }, { typ: VOTYP.OP, op: OP.NEQ, pos: 2 }]},
        { eq: "1 != 1", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value: 1, pos: 0 }, {typ: VOTYP.VAL, value: 1, pos: 5 }, { typ: VOTYP.OP, op: OP.NEQ, pos: 2 }]},
        { eq: "0 == 0", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value: 0, pos: 0 }, {typ: VOTYP.VAL, value: 0, pos: 5 }, { typ: VOTYP.OP, op: OP.EQ, pos: 2 }]},
        { eq: "0 == 1", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value: 0, pos: 0 }, {typ: VOTYP.VAL, value: 1, pos: 5 }, { typ: VOTYP.OP, op: OP.EQ, pos: 2 }]},
        { eq: "1 == 0", ans: { value: 0 }, tokens: [{ typ: VOTYP.VAL, value: 1, pos: 0 }, {typ: VOTYP.VAL, value: 0, pos: 5 }, { typ: VOTYP.OP, op: OP.EQ, pos: 2 }]},
        { eq: "1 == 1", ans: { value: 1 }, tokens: [{ typ: VOTYP.VAL, value: 1, pos: 0 }, {typ: VOTYP.VAL, value: 1, pos: 5 }, { typ: VOTYP.OP, op: OP.EQ, pos: 2 }]},

        // Brackets.
        { eq: "1 + 2 * 3", ans: { value: 7 }, tokens: [{ typ: VOTYP.VAL, value: 1, pos: 0 }, { typ: VOTYP.VAL, value: 2, pos: 4 }, { typ: VOTYP.VAL, value: 3, pos: 8 }, { typ: VOTYP.OP, op: OP.MUL, pos: 6 }, { typ: VOTYP.OP, op: OP.ADD, pos: 2 }]},
        { eq: "(1 + 2) * 3", ans: { value: 9 }, tokens: [{ typ: VOTYP.VAL, value: 1, pos: 1 }, { typ: VOTYP.VAL, value: 2, pos: 5 }, { typ: VOTYP.OP, op: OP.ADD, pos: 3 }, { typ: VOTYP.VAL, value: 3, pos: 10 }, { typ: VOTYP.OP, op: OP.MUL, pos: 8 }, ]},

        // Unary operators.
        { eq: "sin(0.5)", ans: { value: Math.sin(0.5) }, tokens: [{typ: VOTYP.VAL, value: 0.5, pos: 4}, {typ: VOTYP.OP, op: OP.SIN + OP.UNARY, pos: 0}]},
        { eq: "abs(0.5)", ans: { value: Math.abs(0.5) } },
        { eq: "sqrt(0.5)", ans: { value: Math.sqrt(0.5) } },
        { eq: "exp(0.5)", ans: { value: Math.exp(0.5) } },
        { eq: "log10(0.5)", ans: { value: Math.log(0.5) / Math.log(10.00) } },
        { eq: "log(0.5)", ans: { value: Math.log(0.5) } },
        { eq: "ceil(0.5)", ans: { value: Math.ceil(0.5) } },
        { eq: "floor(0.5)", ans: { value: Math.floor(0.5) } },
        { eq: "round(0.5)", ans: { value: Math.floor(0.5 + 0.500) } },
        { eq: "cos(0.5)", ans: { value: Math.cos(0.5) } },
        { eq: "sin(0.5)", ans: { value: Math.sin(0.5) } },
        { eq: "tan(0.5)", ans: { value: Math.tan(0.5) } },
        { eq: "acos(0.5)", ans: { value: Math.acos(0.5) } },
        { eq: "asin(0.5)", ans: { value: Math.asin(0.5) } },
        { eq: "atan(0.5)", ans: { value: Math.atan(0.5) } },
        { eq: "cosh(0.5)", ans: { value: 0.5 * (Math.exp(0.5) + Math.exp(-0.5)) } },
        { eq: "sinh(0.5)", ans: { value: 0.5 * (Math.exp(0.5) - Math.exp(-0.5)) } },
        { eq: "tanh(0.5)", ans: { value: (Math.exp(2 * 0.5) - 1) / (Math.exp(2 * 0.5) + 1) } },
        { eq: "sind(0.5)", ans: { value: Math.sin(0.5 * M_PI_180) } },
        { eq: "cosd(0.5)", ans: { value: Math.cos(0.5 * M_PI_180) } },
        { eq: "tand(0.5)", ans: { value: Math.tan(0.5 * M_PI_180) } },
        { eq: "asind(0.5)", ans: { value: M_180_PI * Math.asin(0.5) } },
        { eq: "acosd(0.5)", ans: { value: M_180_PI * Math.acos(0.5) } },
        { eq: "atand(0.5)", ans: { value: M_180_PI * Math.atan(0.5) } },
        { eq: "!(0.5)", ans: { value: (0.5 == 0.00) ? 1.00 : 0.00 } },
        { eq: "sign(0.5)", ans: { value: (0.5 == 0.00) ? 0.00 : (0.5 < 0.00) ? -1.00 : 1.00 } },

        // Constants.
        { eq: "pi", ans: { value: CEquation.SIConst.pi.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.pi.value, pos: 0 }] },
        { eq: "c", ans: { value: CEquation.SIConst.c.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.c.value, pos: 0 }] },
        { eq: "Z0", ans: { value: CEquation.SIConst.Z0.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.Z0.value, pos: 0 }] },
        { eq: "e0", ans: { value: CEquation.SIConst.e0.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.e0.value, pos: 0 }] },
        { eq: "mu0", ans: { value: CEquation.SIConst.mu0.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.mu0.value, pos: 0 }] },
        { eq: "G", ans: { value: CEquation.SIConst.G.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.G.value, pos: 0 }] },
        { eq: "h", ans: { value: CEquation.SIConst.h.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.h.value, pos: 0 }] },
        { eq: "hbar", ans: { value: CEquation.SIConst.hbar.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.hbar.value, pos: 0 }] },
        { eq: "e", ans: { value: CEquation.SIConst.e.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.e.value, pos: 0 }] },
        { eq: "m_alpha", ans: { value: CEquation.SIConst.m_alpha.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.m_alpha.value, pos: 0 }] },
        { eq: "m_e", ans: { value: CEquation.SIConst.m_e.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.m_e.value, pos: 0 }] },
        { eq: "m_n", ans: { value: CEquation.SIConst.m_n.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.m_n.value, pos: 0 }] },
        { eq: "m_p", ans: { value: CEquation.SIConst.m_p.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.m_p.value, pos: 0 }] },
        { eq: "m_u", ans: { value: CEquation.SIConst.m_u.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.m_u.value, pos: 0 }] },
        { eq: "N_A", ans: { value: CEquation.SIConst.N_A.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.N_A.value, pos: 0 }] },
        { eq: "kB", ans: { value: CEquation.SIConst.kB.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.kB.value, pos: 0 }] },
        { eq: "R", ans: { value: CEquation.SIConst.R.value },tokens: [{ typ: VOTYP.VAL, value: CEquation.SIConst.R.value, pos: 0 }] },

    ];

    const runTests = function () {
        let passed = 0;
        let failed = 0;
        for (const test of testCases) {
            console.log(test.eq + ": ")
            const pass = runTest(test);
            if (pass) {
                passed += 1;
            } else {
                failed += 1;
            }
        }
        console.log(`${passed} passed, ${failed} failed, ${testCases.length} total`);
        return {
            passed: passed,
            failed: failed,
            total: testCases.length
        };
    };

    const runTest = function (test) {
        let pass = true;
        const tokens = CEquation.parse(test.eq);
        const ans = CEquation.evaluate(tokens);
        pass = assertEqual(test.ans.value, ans.value, "Mismatch answer") && pass;

        if (test.tokens) {
            pass = assertEqual(test.tokens.length, tokens.length, "Mismatch tokens length") && pass;
            tokens.forEach(function (token, index) {
                const testToken = test.tokens[index];
                pass = assertEqual(token.typ, testToken.typ, "Mismatch type token " + index) && pass;
                pass = assertEqual(token.pos, testToken.pos, "Mismatch position token " + index) && pass;
                switch (token.typ) {
                    case VOTYP.VAL:
                        pass = assertEqual(token.value, testToken.value, "Mismatch value token " + index) && pass;
                        break;
                        
                    case VOTYP.OP:
                        pass = assertEqual(token.op, testToken.op, "Mismatch op token " + index) && pass;
                        break;

                    default:
                        pass = assert(false, "Unknown token type " + token.typ) && pass;
                }
            });
        }

        return pass;
    };

    CEquation.runTests = runTests;
}(CEquation));
