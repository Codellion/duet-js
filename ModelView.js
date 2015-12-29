/// <reference path="ModelProperty.ts" />
/// <reference path="BindableProperty.ts" />
/// <reference path="IDictionary.ts" />
//IE Fix
(function () {
    function CustomEvent(event, params) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    }
    CustomEvent.prototype = Event.prototype;
    window["CustomEvent"] = CustomEvent;
})();
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
                docElements = elementContainer.querySelectorAll("[data-dt='" + elementModel + "']");
                var mdContainer = new ModelProperty(this, elementContainer);
                for (var bindName in mdContainer.bindings)
                    mdContainer.bindings[bindName].dispatchChangeEvent();
                this.properties.push(mdContainer);
            }
            else
                docElements = document.querySelectorAll("[data-dt='" + modelName + "']");
            if (docElements.length > 0) {
                var docElementsArr = Array.prototype.slice.call(docElements, 0);
                docElementsArr.forEach(function (element, index) {
                    if (element instanceof HTMLElement) {
                        var newProperty = new ModelProperty(_this, element);
                        _this.properties.push(newProperty);
                    }
                });
                for (var bindName in this.bindings)
                    this.bindings[bindName].dispatchChangeEvent();
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
