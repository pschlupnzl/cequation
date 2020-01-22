(function (CEquation) {
    /**
     * Display the array of tokens as the reverse Polish notation stack.
     * @param {array} tokens Array of tokens to display.
     * @returns {string} The formatted string.
     */
    const toString = function (tokens) {
        return tokens
            .map(function (tok) {
                return [
                    new Array(tok.pos).join(" "),
                    "| ",
                    tok.typ === CEquation.VOTYP.VAL ? " Value: " + tok.value :
                    tok.typ === CEquation.VOTYP.OP ? " Operator: " + tok.op :
                    "??"
                ].join("");
            })
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
        const match = /^[0-9]?(?:\.[0-9]*)?(?:e[+-]?[0-9]+)?/.exec(equation.substr(pos));
        return match && match[0];
    };

    CEquation.utils = {
        toString: toString,
        parseError: parseError,
        scanNumber: scanNumber,
        skipWhitespace: skipWhitespace,
    };
}(CEquation));