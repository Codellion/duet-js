var DynamicCode = (function () {
    function DynamicCode() {
    }
    DynamicCode.evalInContext = function (js, context) {
        return function () { return eval(js); }.call(context);
    };
    DynamicCode.parseLambdaExpression = function (js) {
        var result = js;
        var index = js.indexOf("=>", index);
        while (index != -1) {
            var startIndex = DynamicCode.getLamdbaStart(js, index);
            var endCurrentSymbol = js.length - 1;
            var openFuncs = 0;
            var lamdbaFunc = "";
            for (var i = index; i < js.length - 1; i++) {
                if (js[i] === ')') {
                    if (openFuncs == 0) {
                        endCurrentSymbol = i;
                        break;
                    }
                    else
                        openFuncs--;
                }
                if (js[i] === '(')
                    openFuncs++;
            }
            lamdbaFunc = DynamicCode.createLambdaFunction(js.slice(startIndex, endCurrentSymbol + 1));
            result = result.slice(0, startIndex + 1) + lamdbaFunc + result.slice(endCurrentSymbol);
            index = result.indexOf("=>");
        }
        return result;
    };
    DynamicCode.createLambdaFunction = function (js) {
        var result = "";
        var symbolIndex = js.indexOf("=>");
        var startIndex = DynamicCode.getLamdbaStart(js, symbolIndex);
        var endIndex = js.length - 1;
        var param = js.slice(startIndex + 1, symbolIndex);
        var code = js.slice(symbolIndex + 2, endIndex);
        if (code.indexOf("=>") != -1) {
            code = DynamicCode.parseLambdaExpression(code);
        }
        result = "(function(" + param + ") { return (";
        result += code + ");})";
        return result;
    };
    DynamicCode.getLamdbaStart = function (js, symbolIndex) {
        var startIndex = symbolIndex;
        for (var i = symbolIndex; i > -1; i--) {
            if (js[i] === '(') {
                startIndex = i;
                break;
            }
        }
        return startIndex;
    };
    return DynamicCode;
})();
