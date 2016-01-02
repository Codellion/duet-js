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
        if (!this.bindings)
            this.bindings = {};
        this.subModels = new Array();
        this.isInitialization = true;
        if (model) {
            this.model = model;
            if (!model["mutated-observation"])
                this.createObservableObject(this.model);
            else {
                var auxAccesor = model["mutated-accesors"];
                for (var i in auxAccesor)
                    this.bindings[auxAccesor[i]] = model["_" + auxAccesor[i]];
            }
        }
        if (modelName) {
            var docElements = null;
            if (elementContainer) {
                docElements = elementContainer.querySelectorAll("[data-dt='" + elementModel + "']");
                var mdContainer = new ModelProperty(this, elementContainer);
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
            }
            this.properties.forEach(function (n) {
                for (var bindName in n.internalBindings)
                    n.setComponentBinding(n.bindings[bindName]);
            });
        }
        this.isInitialization = false;
    }
    Object.defineProperty(ModelView.prototype, "dispatchEvents", {
        get: function () {
            if (!window["dt-dispatchEvents"])
                window["dt-dispatchEvents"] = [];
            return window["dt-dispatchEvents"];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ModelView.prototype, "bindings", {
        get: function () {
            return window[this.modelName + "_dt-bindings"];
        },
        set: function (value) {
            window[this.modelName + "_dt-bindings"] = value;
        },
        enumerable: true,
        configurable: true
    });
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
    ModelView.prototype.createObservableObject = function (obj, parentName) {
        var _this = this;
        if (typeof (obj) !== "object" || obj["mutated-observation"])
            return;
        var parentPropName = "";
        if (parentName)
            parentPropName = parentName;
        var oriProps = [];
        for (var objProp in obj)
            oriProps.push(objProp);
        for (var objProp in oriProps) {
            var propertyName = oriProps[objProp];
            if (propertyName.indexOf('_') != 0 && typeof (obj[propertyName]) !== "function"
                && propertyName !== "mutated-accesors" && propertyName.indexOf('$') != 0) {
                var result = this.bindings[propertyName];
                if (typeof (result) === "undefined") {
                    result = new BindableProperty(propertyName, this.modelName + "_" + parentPropName + "_" + propertyName, obj[propertyName], obj, true);
                }
                ModelProperty.createAccesorProperty(propertyName, obj, result);
                this.createObservableObject(obj[propertyName], propertyName);
                this.bindings[propertyName] = result;
                document.addEventListener(result.propertyChangeEvent, function (args) {
                    if (!_this.isInitialization) {
                        _this.checkBindDependencies(args);
                        if (obj["_parentReference"] && obj["_parentReference"]._binding) {
                            _this.dispatchEvents.push(args.detail.propertyChangeEvent);
                            obj["_parentReference"]._binding.dispatchChangeEvent(args.detail.name);
                        }
                    }
                }, false);
            }
        }
        if (obj != null)
            obj["mutated-observation"] = true;
    };
    ModelView.prototype.checkBindDependencies = function (args) {
        var name = args.detail.name;
        if (args.detail["_externalReference"] && args.detail["_externalReference"] != null)
            name = args.detail["_externalReference"];
        for (var bindingName in this.bindings) {
            if (bindingName.indexOf('#') == 0 && bindingName !== name) {
                if (this.containsBindReference(bindingName, name))
                    this.bindings[bindingName].dispatchChangeEvent();
            }
        }
    };
    ModelView.isAlphanumeric = function (str, i) {
        var code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) &&
            !(code > 64 && code < 91) &&
            !(code > 96 && code < 123)) {
            return false;
        }
        return true;
    };
    ModelView.prototype.containsBindReference = function (bindingName, reference) {
        var res = false;
        var startIndex = bindingName.indexOf(reference);
        while (startIndex != -1) {
            if (bindingName[startIndex - 1] === '.' && bindingName.length >= startIndex + reference.length
                && !ModelView.isAlphanumeric(bindingName, startIndex + reference.length)) {
                res = true;
                startIndex = -1;
            }
            else {
                startIndex = bindingName.indexOf(reference, startIndex + 1);
            }
        }
        return res;
    };
    return ModelView;
})();
