(function (CEquation) {
    "use strict";

    /**
     * Class to handle processing of units.
     * @param {Array} units Optional units to set when creating this object.
     * @param {number=} scale Optional scale, if not included in units array.
     * @param {number=} offset Optional offset, if not included in units array.
     */
    const Unit = function (units, scale, offset) {
        this.coeffs = [0, 0, 0, 0, 0, 0, 0];
        this.scale = 1.0;
        this.offset = 0.0;
        this.displayString = ""; // Used for formatting only.
        if (units) {
            this.set(units, scale, offset);
        }
        return this;
    };

    /** SI Unit symbols. */
    Unit.symbols = [ "kg", "m", "A", "s", "K", "mol", "cd"];

    /** Unicode superscript characters. */
    Unit.superscripts = "⁻¹²³⁴⁵⁶⁷⁸⁹";

    Unit.dimensionless = new Unit();

    /**
     * Returns a new unit based on the SI units and prefixes.
     * @param {string} unitName Symbol of unit to create.
     * @param {string=} prefixName Optional prefix to use.
     * @returns {object:Unit} Created unit.
     */
    Unit.fromSIUnit = function (unitName, prefixName) {
        let unit = new Unit(CEquation.SIUnits[unitName]);
        if (prefixName) {
            unit = unit.scalar(CEquation.SIPrefix[prefixName]);
        }
        return unit;
    };

    /**
     * Sets the coefficients of this unit.
     * @this {object:Unit} Unit whose coefficients to set.
     * @param {Array} units Array of coefficients.
     * @param {number=} scale Optional scale, if not included in units array.
     * @param {number=} offset Optional offset, if not included in units array.
     * @returns {object:Unit} This unit object for chaining.
     */
    Unit.prototype.set = function (units, scale, offset) {
        this.coeffs.forEach((coeff, index, coeffs) => coeffs[index] = units[index]);
        this.scale = (scale !== undefined ? scale : units[7]) || 1.0;
        this.offset = (offset !== undefined ? offset : units[8]) || 0.0;
        return this;
    };

    /**
     * Returns a pretty-printed unit.
     * @this {object:Unit} Unit to be formatted.
     * @param {string} sep Optional separator between units.
     * @returns {string} String of units with exponents.
     */
    Unit.prototype.toString = function (sep) {
        return (this.scale === 1 ? "" : this.scale)
            + this.displayString
            + Unit.symbols.map((symbol, index) => {
            const coeff = this.coeffs[index];
            return !coeff ? "" :
                coeff === 1 ? symbol :
                Number.isInteger(coeff) && Math.abs(coeff) < Unit.superscripts.length
                    ? symbol + (coeff < 0 ? Unit.superscripts[0] : "") + Unit.superscripts[Math.abs(coeff)] :
                symbol + "^" + coeff;
        }).join(sep || "");
    };

    /**
     * Returns an HTML string of a proper fraction for the units.
     * @this {object:Unit} Unit to be formatted.
     * @returns {string} Formatted HTML text.
     */
    Unit.prototype.toHtml = function () {
        const nom = this.coeffs.map(coeff => coeff > 0 ? coeff : 0);
        const denom = this.coeffs.map(coeff => coeff < 0 ? -coeff : 0);
        const hasNom = nom.some(coeff => coeff > 0);
        const hasDenom = denom.some(coeff => coeff > 0);
        return [
            "<span style='display: inline-block; vertical-align: middle; text-align: center'>",
            "<span style='display: block'>",
            hasNom ? new Unit(nom).toString(" ") : hasDenom ? "1" : "",
            "</span>",
            hasDenom ? "<span style='display: block; border-bottom: 0.08em solid'></span>" : "",
            "<span style='display: block'>",
            hasDenom ? new Unit(denom).toString(" ") : "",
            "</span>",
            "</span>"
        ].join("");
    };

    /**
     * Apply and simplify the units to the value.
     * @param {object} tok Object with "value" and "unit" members.
     */
    Unit.simplify = function (token) {
        const Unit = CEquation.Unit;
        // const SIPrefix = CEquation.SIPrefix;
        const unit = token.unit;
        // let value = token.value * token.unit.scale;
        // let prefix = "";

        /** Count the number of coefficients in the unit. */
        const countCoeffs = function (unit) {
            return unit.coeffs.reduce((prev, curr) => prev + Math.abs(curr), 0);
        }

        // Find the best matching unit, here meaning the one that has
        // the least number of components.
        let best = {
            simplified: unit,
            uncanceled: countCoeffs(unit)
        };
        CEquation.SIDisplayUnits.forEach(function (unitName) {
            const simplified = unit.divide(Unit.fromSIUnit(unitName));
            const uncanceled = countCoeffs(simplified);
            if (uncanceled < best.uncanceled) {
                simplified.displayString = unitName;
                best = {
                    simplified: simplified,
                    uncanceled: uncanceled
                };
            }
        });

        if (best) {
            token.unit = best.simplified;
        }
        const unitMag = unit.coeffs.reduce((prev, curr) => prev + curr * curr, 0);
        CEquation.SIDisplayUnits.forEach(function (unitName) {
            const siUnit = Unit.fromSIUnit(unitName);
            const siMag = siUnit.coeffs.reduce((prev, curr) => prev + curr * curr, 0);
            const cos = siUnit.coeffs.reduce((prev, curr, index) => prev + curr * unit.coeffs[index], 0)
                // / (unitMag * siMag);
            console.log(JSON.stringify(unit.coeffs), unitMag, unitName, JSON.stringify(siUnit.coeffs), siMag, cos);
        })

        // // // If only single positive powers (e.g. kgAs), simplify with prefix.
        // // const hasPowers = unit.coeffs.some(coeff => !!coeff);
        // // const singlePowers = unit.coeffs.every(coeff => coeff === 1 || coeff === 0);
        // // if (value && hasPowers && singlePowers) {
        // //     // const sign = value < 0 ? -1 : +1;
        // //     const mag = Math.floor(Math.log10(Math.abs(value))); // Order of magnitude.
        // //     let pow = 3 * Math.floor((mag) / 3); // Power to round to.
        // //     pow = pow > CEquation.SIPrefixMax ? CEquation.SIPrefixMax :
        // //         pow < CEquation.SIPrefixMin ? CEquation.SIPrefixMin : pow;
        // //     if (pow) {
        // //         prefix = Object.keys(SIPrefix).find(key => Math.floor(Math.log10(SIPrefix[key])) === pow);
        // //         value /= Math.pow(10, pow);
        // //     }
        // // }
        
        // token.value = value;
        // token.unit.scale = 1.0;
        // token.unit.prefix = prefix;
    };

    /**
     * Returns a value indicating whether the unit matches this object.
     * @this {object:Unit} Unit to compare against.
     * @param {object:Unit} unit Unit to match.
     * @returns {boolean} Value indicating whether the units match.
     */
    Unit.prototype.same = function (unit) {
        return !this.coeffs.some((coeff, index) => coeff !== unit.coeffs[index]);
    };

    /**
     * Returns a value indicating whether two units are equivalent.
     * @this {object:Unit} Unit to compare against.
     * @param {object:Unit} unit Unit to compare.
     * @returns {boolean} Value indicating whether the units are equivalent.
     */
    Unit.prototype.equals = function (unit) {
        return this.same(unit)
            && this.scale === unit.scale
            && this.offset === unit.offset;
    };

    /**
     * Returns a value indicating whether the unit is dimensionless.
     * @this {object:Unit} Unit to test.
     * @returns {boolean} Value indicating whether the unit is dimensionless.
     */
    Unit.prototype.isDimensionless = function () {
        return !this.coeffs.some(coeff => !!coeff);
    };

    /**
     * Multiplies this unit by the supplied units.
     * @this {object:Unit} Unit to multiply.
     * @param {object:Unit} unit Unit to multiply by.
     * @returns {object:Unit} Unit object for chaining.
     */
    Unit.prototype.mult = function (unit) {
        return new Unit(
            this.coeffs.map((coeff, index) => coeff + unit.coeffs[index]),
            this.scale * unit.scale,
            this.offset + unit.offset);
    };
    
    /**
     * Returns a new unit scaled by e.g. a prefix value.
     * @this {object:Unit} Unit to scale.
     * @param {number} scalar Value to scale by.
     * @returns {object:Unit} New unit object.
     */
    Unit.prototype.scalar = function (scalar) {
        return new Unit(this.coeffs, this.scale * scalar, this.offset);
    };

    /**
     * Raises the unit by the given power.
     * @this {object:Unit} Unit to raise to the power.
     * @param {number} scalar Power to raise by.
     * @returns {objectUnit}
     */
    Unit.prototype.power = function (scalar) {
        return new Unit(
            this.coeffs.map(coeff => coeff * scalar),
            Math.pow(this.scale, scalar),
            this.offset);
    };

    /**
     * Inverts this unit.
     * @this {object:Unit} Unit to be inverted.
     * @returns {object:Unit} This unit object for chaining.
     */
    Unit.prototype.invert = function () {
        this.coeffs.forEach((coeff, index, coeffs) => coeffs[index] = -coeff);
        this.scale = 1 / this.scale;
        this.offset = -this.offset;
        return this;
    };

    /**
     * Divide this unit by the given unit.
     * @this {object:Unit} Unit to be divided.
     * @param {object:Unit} unit Unit to divide by.
     * @returns {object:Unit} Unit representing the ratio between the two.
     */
    Unit.prototype.divide = function (unit) {
        return this.mult(unit.invert());
    };

    /**
     * Returns a new Unit that is the first divided by the second.
     * @this {object:Unit} Unit to divide
     * @param {object:Unit} unit Unit to divide by.
     * @returns {object:Unit} New Unit that is the ratio of the two units.
     */
    Unit.prototype.div = function (unit) {
        return this.mult(unit.invert());
    };

    CEquation.Unit = Unit;
}(CEquation));