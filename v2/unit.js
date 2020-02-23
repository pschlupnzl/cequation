(function (CEquation) {
    "use strict";

    /**
     * Class to handle processing of units. It is an array of symbols,
     * prefixes, and powers, with additional functions.
     * @param {string} symbol Symbol of unit, or empty string for dimensionless.
     * @param {string=} prefix Optional prefix of unit, if used.
     * @param {number=} power Optional power, defaults to 1.
     */
    const Unit = function (symbol, prefix, power) {
        if (symbol) {
            this.push({
                symbol: symbol || "",
                prefix: prefix || "",
                power: power === undefined ? 1 : power
            });
        }
    };

    const UnitPrototype = function () {};
    UnitPrototype.prototype = Array.prototype;
    Unit.prototype = new UnitPrototype();

    // /** SI Unit symbols. */
    // Unit.symbols = [ "kg", "m", "A", "s", "K", "mol", "cd"];

    /** Unicode superscript characters. */
    Unit.superscripts = "⁻¹²³⁴⁵⁶⁷⁸⁹";

    // Unit.dimensionless = new Unit();

    /**
     * Adds the values of the two tokens, including their units,
     * returning a new token. The units are assumed to be compatible.
     * @param {object} tok1 First token to be added.
     * @param {object} tok2 Second token to be added, or subtracted.
     * @param {boolean=} inverse Value indicating whether the values
     *    should be subtracted, rather than added.
     */
    Unit.addValues = function (tok1, tok2, inverse) {
        const scale = tok2.unit.prefixScale() / tok1.unit.prefixScale();
        return {
            value: tok1.value + (inverse ? -1 : 1) * tok2.value * scale,
            unit: tok1.unit
        };
    };

    /**
     * Multiplies the values of the two tokens, including their units,
     * returning a new token.
     * @param {object} tok1 First token to be multiplied.
     * @param {object} tok2 Second token to be multiplied, or divided.
     * @param {boolean=} inverse Value indicating whether the values
     *    should be divided, rather than multiplied.
     */
    Unit.multiplyValues = function (tok1, tok2, inverse) {
        const unit = inverse 
            ? tok1.unit.div(tok2.unit)
            : tok1.unit.mult(tok2.unit);
        const scale = unit.aggregate();
        return {
            value: scale * tok1.value * (inverse ? 1 / tok2.value : tok2.value),
            unit: unit
        };
    };

    /**
     * Compare the values, including units. Assumes the units
     * are compatible.
     * @param {object} tok1 Token to compare.
     * @param {object} tok2 Token to compare against.
     * @param {enum} op Operator.
     * @returns {object} Dimensionless token with 1 if the comparison is true, otherwise 0.
     */
    Unit.comparison = function (tok1, tok2, op) {
        const OP = CEquation.OP;
        const val1 = tok1.value * tok1.unit.prefixScale();
        const val2 = tok2.value * tok2.unit.prefixScale();
        let val = 0;
        switch (op) {
            case OP.LTE: val = val1 <= val2 ? 1 : 0; break;
            case OP.GTE: val = val1 >= val2 ? 1 : 0; break;
            case OP.LT : val = val1 <  val2 ? 1 : 0; break;
            case OP.GT : val = val1 >  val2 ? 1 : 0; break;
            case OP.NEQ: val = val1 != val2 ? 1 : 0; break;
            case OP.EQ : val = val1 == val2 ? 1 : 0; break;
        }
        return {
            value: val,
            unit: new Unit()
        };
    };

    /**
     * Simplify the token and 
     */
    Unit.simplify = function (tok) {
        const SIUnits = CEquation.SIUnits;
        const unit = tok.unit;
        if (unit.length > 0) {
            const unitArray = unit.toSIArray();

            // Strategy
            // Compare unit to be simplified with each SI display unit
            // candidate. If all of the powers line up, with the same
            // ratio, then we can simplify it.
            // Example: s/mJ
            //        unit = [{ symbol: "s", power: 1}, { symbol: "J", prefix:"m", power: -1}]
            //   unitArray = [-1, -2, 0,  3, 0, 0, 0]
            //   SIUnits.W = [ 1,  2, 0, -3, 0, 0, 0]
            //       power = -1
            // prefixScale = 1000
            //     siScale = 1
            // Result : 1/W.
            for (let symbol of CEquation.SIDisplayUnits) {
                const siArray = SIUnits[symbol];
                const coeffs = unitArray.map((u, index) =>
                        u === 0.0 && siArray[index] === 0.0 ? null : // Not power of either.
                        siArray[index] === 0.0 ? 0 : // Missing on SI candidate.
                        u / siArray[index] // Ratio of powers.
                    ).filter(v => v !== null); // Eliminate where not power of either.

                const power = coeffs[0];
                if (coeffs.every(v => v !== 0)
                    && coeffs.every(v => v === power)) {
                        return {
                            value: tok.value * unit.prefixScale() / Math.pow(siArray[7], power),
                            unit: new Unit(symbol, "", power)
                        };
                    }
            }
        }
        return tok;
    };

    // /**
    //  * Returns a new unit based on the SI units and prefixes.
    //  * @param {string} symbol Symbol of unit to create.
    //  * @param {string=} prefixName Optional prefix to use.
    //  * @returns {object:Unit} Created unit.
    //  */
    // Unit.fromSIUnit = function (symbol, prefixName) {
    //     let unit = new Unit(symbol, CEquation.SIUnits[symbol]);
    //     if (prefixName) {
    //         unit = unit.scalar(CEquation.SIPrefix[prefixName]);
    //     }
    //     return unit;
    // };

    // /**
    //  * Sets the coefficients of this unit.
    //  * @this {object:Unit} Unit whose coefficients to set.
    //  * @param {string} symbol Symbol of unit.
    //  * @param {Array} units Array of coefficients.
    //  * @param {number=} scale Optional scale, if not included in units array.
    //  * @param {number=} offset Optional offset, if not included in units array.
    //  * @returns {object:Unit} This unit object for chaining.
    //  */
    // Unit.prototype.set = function (symbol, units, scale, offset) {
    //     this.symbol = symbol;
    //     this.coeffs.forEach((coeff, index, coeffs) => coeffs[index] = units[index]);
    //     this.scale = (scale !== undefined ? scale : units[7]) || 1.0;
    //     this.offset = (offset !== undefined ? offset : units[8]) || 0.0;
    //     return this;
    // };

    /**
     * Returns a pretty-printed unit.
     * @this {object:Unit} Unit to be formatted.
     * @param {string} sep Optional separator between units.
     * @returns {string} String of units with exponents.
     */
    Unit.prototype.toString = function (sep) {
        return "[" + this.map(u =>
            `${u.prefix}${u.symbol}${u.power === 1 ? "" : u.power < 0 ? Unit.superscripts[0] + Unit.superscripts[-u.power] : Unit.superscripts[u.power]}`
        ).join(sep || " ") + "]" + " (" + this.prefixScale() + ")";
    };

    // /**
    //  * Returns an HTML string of a proper fraction for the units.
    //  * @this {object:Unit} Unit to be formatted.
    //  * @returns {string} Formatted HTML text.
    //  */
    // Unit.prototype.toHtml = function () {
    //     const nom = this.coeffs.map(coeff => coeff > 0 ? coeff : 0);
    //     const denom = this.coeffs.map(coeff => coeff < 0 ? -coeff : 0);
    //     const hasNom = nom.some(coeff => coeff > 0);
    //     const hasDenom = denom.some(coeff => coeff > 0);
    //     return [
    //         "<span style='display: inline-block; vertical-align: middle; text-align: center'>",
    //         "<span style='display: block'>",
    //         hasNom ? new Unit("", nom).toString(" ") : hasDenom ? "1" : "",
    //         "</span>",
    //         hasDenom ? "<span style='display: block; border-bottom: 0.08em solid'></span>" : "",
    //         "<span style='display: block'>",
    //         hasDenom ? new Unit("", denom).toString(" ") : "",
    //         "</span>",
    //         "</span>"
    //     ].join("");
    // };

    // /**
    //  * Apply and simplify the units to the value.
    //  * @param {object} tok Object with "value" and "unit" members.
    //  */
    // Unit.simplify = function (token) {
    //     const Unit = CEquation.Unit;
    //     // const SIPrefix = CEquation.SIPrefix;
    //     const unit = token.unit;
    //     // let value = token.value * token.unit.scale;
    //     // let prefix = "";

    //     if (!unit.isDimensionless()) {

    //         // /** Count the number of coefficients in the unit. */
    //         // const countCoeffs = function (unit) {
    //         //     return unit.coeffs.reduce((prev, curr) => prev + Math.abs(curr), 0);
    //         // }

    //         // Find the best matching unit, here meaning the one that has
    //         // the least number of components.
    //         // let best = {
    //         //     simplified: unit,
    //         //     uncanceled: countCoeffs(unit)
    //         // };
    //         // CEquation.SIDisplayUnits.forEach(function (unitName) {
    //         //     const simplified = unit.divide(Unit.fromSIUnit(unitName));
    //         //     const uncanceled = countCoeffs(simplified);
    //         //     if (uncanceled < best.uncanceled) {
    //         //         simplified.displayString = unitName;
    //         //         best = {
    //         //             simplified: simplified,
    //         //             uncanceled: uncanceled
    //         //         };
    //         //     }
    //         // });


            
    //         let best = null;
    //         const unitMag = Math.sqrt(unit.coeffs.reduce((prev, curr) => prev + curr * curr, 0));
    //         CEquation.SIDisplayUnits.forEach(function (symbol) {
    //             const siUnit = Unit.fromSIUnit(symbol);
    //             const siMag = Math.sqrt(siUnit.coeffs.reduce((prev, curr) => prev + curr * curr, 0));
    //             const cos = siUnit.coeffs.reduce((prev, curr, index) => prev + curr * unit.coeffs[index], 0)
    //                 / (unitMag * siMag);
    //             const pow = Math.round(unitMag / siMag);
    //             if (!best
    //                 || Math.abs(cos) > Math.abs(best.cos)
    //                 || (cos === 1 && best.cos === -1)) {
    //                 best = {
    //                     symbol: symbol,
    //                     unit: siUnit,
    //                     pow: pow,
    //                     cos: cos
    //                 };
    //             }
    //         });

    //         console.log(best)
    //         if (best && best.pow) {
    //             if (best.cos === -1) {
    //                 // Single negative power: Use inverted unit.
    //                 best.cos = -best.cos;
    //                 best.pow = -best.pow;
    //             }
    //             token.unit = token.unit.divide(best.unit.power(best.pow));
    //             token.unit.symbol = best.symbol + (best.pow === 1 ? "" : "^" + best.pow);
    //         }
    //     }

    //     // // // If only single positive powers (e.g. kgAs), simplify with prefix.
    //     // // const hasPowers = unit.coeffs.some(coeff => !!coeff);
    //     // // const singlePowers = unit.coeffs.every(coeff => coeff === 1 || coeff === 0);
    //     // // if (value && hasPowers && singlePowers) {
    //     // //     // const sign = value < 0 ? -1 : +1;
    //     // //     const mag = Math.floor(Math.log10(Math.abs(value))); // Order of magnitude.
    //     // //     let pow = 3 * Math.floor((mag) / 3); // Power to round to.
    //     // //     pow = pow > CEquation.SIPrefixMax ? CEquation.SIPrefixMax :
    //     // //         pow < CEquation.SIPrefixMin ? CEquation.SIPrefixMin : pow;
    //     // //     if (pow) {
    //     // //         prefix = Object.keys(SIPrefix).find(key => Math.floor(Math.log10(SIPrefix[key])) === pow);
    //     // //         value /= Math.pow(10, pow);
    //     // //     }
    //     // // }
        
    //     // token.value = value;
    //     // token.unit.scale = 1.0;
    //     // token.unit.prefix = prefix;
    // };

    /**
     * Returns a value indicating whether the unit matches this object.
     * @this {object:Unit} Unit to compare against.
     * @param {object:Unit} unit Unit to match.
     * @returns {boolean} Value indicating whether the units match.
     */
    Unit.prototype.same = function (unit) {
        // Quick check.
        if (this.length === unit.length
            && this.every((u, index) =>
                u.symbol === unit[index].symbol 
                && u.prefix === unit[index].prefix
                && u.power === unit[index].power)) {
            return true;
        }

        // Compare base unit powers.
        const unitSI = unit.toSIArray();
        return this.toSIArray().every((p, index) => p === unitSI[index]);
    };

    /**
     * Returns an array of SI
     * @this {object:Unit} Unit whose components to convert.
     * @returns {Array<number>} Array of powers for each SI unit.
     */
    Unit.prototype.toSIArray = function () {
        const siArray = this.reduce((prev, u) => {
            const ff = CEquation.SIUnits[u.symbol];
            return prev.map((p, index) => p + ff[index] * u.power);
        }, CEquation.SIUnits.dimensionless.slice(0, 7));
        return siArray;
    };

    /**
     * Returns the scale factor of all prefixes in this unit, including
     * factors from each base unit.
     * @this {object:Unit} Unit whose scale to determine.
     * @returns {number} Scale factor for all prefixes.
     */
    Unit.prototype.prefixScale = function () {
        const scale = this.reduce((prev, u) => 
            prev * Math.pow(
                CEquation.SIUnits[u.symbol][7] * (CEquation.SIPrefix[u.prefix] || 1),
                u.power)
            , 1);
        return scale;
    };

    // /**
    //  * Returns a value indicating whether two units are equivalent.
    //  * @this {object:Unit} Unit to compare against.
    //  * @param {object:Unit} unit Unit to compare.
    //  * @returns {boolean} Value indicating whether the units are equivalent.
    //  */
    // Unit.prototype.equals = function (unit) {
    //     return this.same(unit)
    //         && this.scale === unit.scale
    //         && this.offset === unit.offset;
    // };

    /**
     * Returns a value indicating whether the unit is dimensionless.
     * @this {object:Unit} Unit to test.
     * @returns {boolean} Value indicating whether the unit is dimensionless.
     */
    Unit.prototype.isDimensionless = function () {
        return this.length === 0
            || this.toSIArray().every(v => v === 0);
    };

    /**
     * Cancel out repeated units, e.g. J m J² m⁻¹ -> J³ in place.
     * @this {object:Unit} Unit whose components to aggregate.
     * @returns {object:Unit} Cancelled scale factor.
     */
    Unit.prototype.aggregate = function () {
        const scale = this.prefixScale();
        const ksymbol = {};
        this.forEach((u) => ksymbol[u.symbol] = (ksymbol[u.symbol] || 0) + u.power);
        for (let index = 0; index < this.length; index += 1) {
            const symbol = this[index].symbol;
            if (ksymbol[symbol]) {
                this[index].power = ksymbol[symbol];
                this[index].prefix = "";
                delete ksymbol[symbol];
            } else {
                this.splice(index, 1);
                index -= 1;
            }
        }
        return scale;
    };

    // // TODO: Test!    
    // const u = new Unit("J", "", 1);
    // // u.push({ symbol: "J", prefix: "", power: 1 });
    // u.push({ symbol: "m", prefix: "", power: 1 });
    // u.push({ symbol: "J", prefix: "m", power: 2 });
    // u.push({ symbol: "m", prefix: "", power: -1 });
    // console.log(u);
    // u.aggregate();
    // console.log(u)

    /**
     * Multiplies this unit by the supplied units.
     * @this {object:Unit} Unit to multiply.
     * @param {object:Unit} unit Unit to multiply by.
     * @returns {object:Unit} Unit object for chaining.
     */
    Unit.prototype.mult = function (unit) {
        unit.forEach(u => this.push(u));
        return this;
    };
    
    // /**
    //  * Returns a new unit scaled by e.g. a prefix value.
    //  * @this {object:Unit} Unit to scale.
    //  * @param {number} scalar Value to scale by.
    //  * @returns {object:Unit} New unit object.
    //  */
    // Unit.prototype.scalar = function (scalar) {
    //     return new Unit(this.symbol, this.coeffs, this.scale * scalar, this.offset);
    // };

    /**
     * Raises the unit by the given power.
     * @this {object:Unit} Unit to raise to the power.
     * @param {number} scalar Power to raise by.
     * @returns {object:Unit} This unit object for chaining.
     */
    Unit.prototype.power = function (scalar) {
        this.forEach(u => u.power *= scalar);
        return this;
    };

    /**
     * Inverts this unit.
     * @this {object:Unit} Unit to be inverted.
     * @returns {object:Unit} This unit object for chaining.
     */
    Unit.prototype.invert = function () {
        for (let index = 0; index < this.length; index += 1) {
            this[index].power = -this[index].power;
        }
        return this;
    };

    /**
     * Divides this unit by the given one.
     * @this {object:Unit} Unit to divide
     * @param {object:Unit} unit Unit to divide by.
     * @returns {object:Unit} This unit that was divided.
     */
    Unit.prototype.div = function (unit) {
        return this.mult(unit.invert());
    };

    CEquation.Unit = Unit;
}(CEquation));