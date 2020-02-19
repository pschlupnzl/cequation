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
        // const Unit = function (symbol, units, scale, offset) {
        // this.symbol = symbol || "";
        // this.coeffs = [0, 0, 0, 0, 0, 0, 0];
        // this.scale = 1.0;
        // this.offset = 0.0;
        // if (units) {
        //     this.set(symbol, units, scale, offset);
        // }
        // return this;
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
     * @param {object} tok2 Second token to be added.
     * @param {boolean=} inverse Value specifying whether the values
     *    should be subtracted, rather than added.
     */
    Unit.addValues = function (tok1, tok2, inverse) {
        const scale = tok2.unit.toSIArray()[7] / tok1.unit.toSIArray()[7];
        return {
            value: tok1.value + (inverse ? -1 : 1) * tok2.value * scale,
            unit: tok1.unit
        };
    }

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
        ).join(sep || " ") + "]";
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
        return this.toSIArray().every((p, index) => p === unitSI[index] || index >= 7);
    };

    /**
     * Returns an array of SI
     * @this {object:Unit} Unit whose components to convert.
     * @returns {Array<number>} Array of powers for each SI unit.
     */
    Unit.prototype.toSIArray = function () {
        const siArray = this.reduce((prev, u) => {
            const ff = CEquation.SIUnits[u.symbol];
            return prev.map((p, index) =>
                    index === 7 ? p * Math.pow(ff[index], u.power) * (CEquation.SIPrefix[u.prefix] || 1) :
                    p + (ff[index] * u.power)
                );
            }, CEquation.SIUnits.dimensionless);
        return siArray;
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

    // /**
    //  * Returns a value indicating whether the unit is dimensionless.
    //  * @this {object:Unit} Unit to test.
    //  * @returns {boolean} Value indicating whether the unit is dimensionless.
    //  */
    // Unit.prototype.isDimensionless = function () {
    //     return !this.coeffs.some(coeff => !!coeff);
    // };

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