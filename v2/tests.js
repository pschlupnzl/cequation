(function (CEquation) {
    const OP = CEquation.OP;
    const VOTYP = CEquation.VOTYP;
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
    };

    const runTest = function (test) {
        let pass = true;
        const tokens = CEquation.parse(test.eq);
        const ans = CEquation.eval(tokens);
        pass = assertEqual(test.tokens.length, tokens.length, "Mismatch tokens length") && pass;
        pass = assertEqual(test.ans.value, ans.value, "Mismatch answer") && pass;
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
        return pass;
    };

    CEquation.runTests = runTests;
}(CEquation));
