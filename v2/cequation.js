(function (window) {
    "use strict";
    
    const CEquation = function () {
        console.log('created');
        console.log(CEquation.OP)
    };

    window.CEquation = CEquation;
}(window));