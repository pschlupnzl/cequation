(function (CEquation) {
    "use strict"
    
    /**
     * Assert that the value is truthy.
     * @param {boolean} test Testing value.
     * @param {string} message Error message to show if assertion fails.
     * @returns {boolean} Value indicating whether the test passed.
     */
    const assert = function (test, message) {
        if (!test) {
            console.log(message)
            return false;
        }
        return true;
    };

    /**
     * Asserts that two values are equal.
     * @param {object} expect The expected value.
     * @param {object} actual The actual value.
     * @param {string} message Error message to show if assertion fails.
     * @returns {boolean} Value indicating whether the test passed.
     */
    const assertEqual = function (expect, actual, message) {
        return assert(expect === actual, `(${expect} !== ${actual}) ${message}`);
    };

    /**
     * Display the array of tokens as the reverse Polish notation stack.
     * @param {array} tokens Array of tokens to display.
     * @returns {string} The formatted string.
     */
    const toString = function (tokens) {
        const kopch = {};
        for (let key in CEquation.opch) {
            if (CEquation.opch.hasOwnProperty(key)) {
                kopch[CEquation.opch[key]] = key;
            }
        }
        return tokens
            .map(tok => [
                    new Array(tok.pos).join(" "),
                    "|",
                    tok.typ === CEquation.VOTYP.VAL ? "Value: " + tok.value + " " + tok.unit.toString() :
                    tok.typ === CEquation.VOTYP.OP ? "Operator: " + (kopch[tok.op] || tok.op) :
                    tok.typ === CEquation.VOTYP.UNIT ? "Unit: " + tok.unit.toString() :
                    "??"
                ].join(""))
            .join("\n");
    };

    /**
     * Default error handling if none supplied to parser.
     * @param {string} equation Source equation
     * @param {number} pos Index where error occurred.
     * @param {string} message Error message.
     * @param {array} tokens Array of tokens, as partially parsed.
     */
    const parseError = function (equation, pos, message, tokens) {
        console.log(equation);
        console.log((new Array(pos + 1)).join("-") + "^ " + message);
        return tokens;
    };
    
    /**
     * Default error handling if none supplied to the evaluator.
     * @param {number} pos Index where error occurred.
     * @param {string} message Error message.
     */
    const evalError = function (pos, message) {
        console.log((new Array(pos + 1)).join("-") + "| " + message);
    };

    /**
     * Returns the index of the next non-blank character.
     * @param {string} equation Source equation.
     * @param {number} pos Starting index where to skip spaces.
     * @returns {number} The index of the next non-blank character.
     */
    const skipWhitespace = function (equation, pos) {
        return pos + /\s*/.exec(equation.substr(pos))[0].length;
    }

    /**
     * Returns the string of characters that constitute a
     * numeric value starting at the given index. The number
     * is always positive; the leading negative sign is
     * intentionally omitted. If a number cannot be matched,
     * returns NULL.
     * @param {string} equation Source equation.
     * @param {number} pos Starting index where to scan.
     * @returns {string} Number string.
     */
    const scanNumber = function (equation, pos) {
        const match = /^[0-9]*(?:\.[0-9]*)?(?:e[+-]?[0-9]+)?/.exec(equation.substr(pos));
        return match && match[0];
    };

    /**
     * Strips unsightly roundoff errors, e.g. 0.100000000003 -> 0.1.
     * @param {number} number Value to truncate.
     * @returns {string} Formatted number.
     */
    const stripRoundoff = function (number) {
        // See https://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript
        return parseFloat(number).toPrecision(15)
            .replace(/(\..*?)0+$/, "$1")
            .replace(/\.$/, "");
    }

    CEquation.utils = {
        assert: assert,
        assertEqual: assertEqual,
        toString: toString,
        parseError: parseError,
        evalError: evalError,
        scanNumber: scanNumber,
        skipWhitespace: skipWhitespace,
        stripRoundoff: stripRoundoff,
    };
}(CEquation));