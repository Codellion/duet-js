/// <reference path="ModelView.ts" />
var duet = (function () {
    function duet() {
    }
    duet.bind = function (modelName, model) {
        return new ModelView(modelName, model);
    };
    return duet;
})();
