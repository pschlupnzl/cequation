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
        this.prefix = ""; // Used for formatting only.
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
            + this.prefix
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
        const SIPrefix = CEquation.SIPrefix;
        const unit = token.unit;
        let value = token.value * token.unit.scale;
        let prefix = "";
        
        // If only single positive powers (e.g. kgAs), simplify with prefix.
        const hasPowers = unit.coeffs.some(coeff => !!coeff);
        const singlePowers = unit.coeffs.every(coeff => coeff === 1 || coeff === 0);
        if (value && hasPowers && singlePowers) {
            // const sign = value < 0 ? -1 : +1;
            const mag = Math.floor(Math.log10(Math.abs(value))); // Order of magnitude.
            let pow = 3 * Math.floor((mag) / 3); // Power to round to.
            pow = pow > CEquation.SIPrefixMax ? CEquation.SIPrefixMax :
                pow < CEquation.SIPrefixMin ? CEquation.SIPrefixMin : pow;
            if (pow) {
                prefix = Object.keys(SIPrefix).find(key => Math.floor(Math.log10(SIPrefix[key])) === pow);
                value /= Math.pow(10, pow);
            }
        }
        
        token.value = value;
        token.unit.scale = 1.0;
        token.unit.prefix = prefix;
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
            this.coeffs.map(coeff => coeff + scalar),
            this.scale * scalar,
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