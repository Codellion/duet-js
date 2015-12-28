/// <reference path="ModelProperty.ts" />
/// <reference path="BindableProperty.ts" />
/// <reference path="IDictionary.ts" />
var ModelView = (function () {
    function ModelView(modelName, model, elementContainer, elementModel) {
        var _this = this;
        this.modelName = modelName;
        this.properties = new Array();
        this.bindings = {};
        this.subModels = new Array();
        this.isInitialization = true;
        if (model) {
            this.model = model;
        }
        if (modelName) {
            var docElements = null;
            if (elementContainer) {
                docElements = elementContainer.querySelectorAll("[data-mh='" + elementModel + "']");
                var mdContainer = new ModelProperty(this, elementContainer);
                for (var bindName in mdContainer.bindings)
                    mdContainer.bindings[bindName].dispatchChangeEvent();
                this.properties.push(mdContainer);
            }
            else
                docElements = document.querySelectorAll("[data-mh='" + modelName + "']");
            if (docElements.length > 0) {
                var docElementsArr = Array.prototype.slice.call(docElements, 0);
                docElementsArr.forEach(function (element, index) {
                    if (element instanceof HTMLElement) {
                        var newProperty = new ModelProperty(_this, element);
                        _this.properties.push(newProperty);
                    }
                });
                this.properties.forEach(function (p) {
                    for (var bindName in p.bindings)
                        p.bindings[bindName].dispatchChangeEvent();
                });
            }
        }
        this.isInitialization = false;
    }
    Object.defineProperty(ModelView.prototype, "modelName", {
        get: function () {
            return this._modelName;
        },
        set: function (value) {
            this._modelName = value;
        },
        enumerable: true,
        configurable: true
    });
    return ModelView;
})();
