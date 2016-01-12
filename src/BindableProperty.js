/// <reference path="ObservableArray.ts" />
/// <reference path="ModelProperty.ts" />
/// <reference path="DynamicCode.ts" />
var BindableProperty = (function () {
    function BindableProperty(propertyName, internalExpression, value, parentValue, model, element, isIndependent) {
        this.dirty = false;
        this._funcExpresion = null;
        this._funcIsChecked = false;
        this.name = propertyName;
        this._internalExpression = internalExpression;
        this._tempValue = null;
        this._parentValue = parentValue;
        this._externalReference = null;
        this.propertyChange = new CustomEvent(this.propertyChangeEvent, { detail: this });
        this.model = model;
        this.htmlComponent = element;
        this.references = new Array();
        this.ignore = false;
        if (Array.isArray(value) || value instanceof ObservableArray) {
            if (Array.isArray(value)) {
                var obsArr = null;
                if (!isIndependent)
                    obsArr = new ObservableArray(propertyName);
                else
                    obsArr = new ObservableArray(propertyName, this);
                obsArr.initialize(value);
                this.value = obsArr;
            }
            else
                this.value = value;
            this.dirty = true;
        }
        else {
            this.value = value;
        }
    }
    Object.defineProperty(BindableProperty.prototype, "funcDefinition", {
        get: function () {
            return this._funcDefinition;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindableProperty.prototype, "internalExpression", {
        get: function () {
            return this._internalExpression;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindableProperty.prototype, "dispatchEvents", {
        get: function () {
            if (!window["dt-dispatchEvents"])
                window["dt-dispatchEvents"] = [];
            return window["dt-dispatchEvents"];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindableProperty.prototype, "value", {
        get: function () {
            var _this = this;
            var propName = this.name;
            if ((this._internalExpression.indexOf('#') == 0 || this._internalExpression.indexOf('@') == 0) && this.dirty == true) {
                var result = null;
                var func = this._funcExpresion;
                if (func == null) {
                    func = this._internalExpression.slice(1);
                    if (func.indexOf("=>") != -1)
                        func = DynamicCode.parseLambdaExpression(func);
                }
                if (this._internalExpression.indexOf('@') == 0) {
                    this._eventExpresion = func;
                    var self = this;
                    result = (function () {
                        window["dt-dispatchEvents"] = [];
                        var scope = self._parentValue;
                        scope.model = self.model;
                        scope.view = this;
                        var evalFunction = DynamicCode.evalInContext(self._eventExpresion, scope);
                        scope.model = undefined;
                        scope.view = undefined;
                        return evalFunction;
                    });
                }
                else {
                    this._funcExpresion = func;
                    if (!this._funcIsChecked && func.indexOf('this.') == 0 && func.indexOf('(') != -1) {
                        var funcAux = func.replace('this.', '');
                        funcAux = funcAux.slice(0, funcAux.indexOf('('));
                        this.isFunction = this._parentValue[funcAux] ? typeof this._parentValue[funcAux] === "function" : false;
                        if (this.isFunction)
                            this._funcDefinition = this._parentValue[funcAux];
                        this._funcIsChecked = true;
                    }
                    var scope = this._parentValue;
                    scope.model = this.model;
                    scope.view = this.htmlComponent;
                    result = DynamicCode.evalInContext(func, scope);
                    scope.model = undefined;
                    scope.view = undefined;
                }
                this._value = result;
                this.dirty = false;
            }
            else {
                if (typeof this._value === "function" && this._funcExpresion === null) {
                    var scope = this._parentValue;
                    var model = this.model;
                    var view = this.htmlComponent;
                    this._funcExpresion = this._value.toString();
                    scope['_bind_' + this._internalExpression] = this._value;
                    var funcExpress = "_bind_" + this._internalExpression;
                    this._value = (function () {
                        scope.model = model;
                        scope.view = this;
                        window["dt-dispatchEvents"] = [];
                        scope[funcExpress]();
                        scope.model = undefined;
                        scope.view = undefined;
                    });
                }
                else if ((this.htmlComponent instanceof HTMLSelectElement) && this.htmlComponent.dataset
                    && this.htmlComponent.dataset['dtValue']
                    && this.htmlComponent.dataset['dtValue'] === this.internalExpression
                    && this.htmlComponent.dataset['dtChildren']
                    && this.dirty) {
                    var childProp = this.htmlComponent.dataset['dtChildren'];
                    var filterProp = this._parentValue["_" + childProp].selectValueProp;
                    if (typeof filterProp !== "undefined") {
                        this._objectValue = this._parentValue[childProp].find(function (n) { return n[filterProp] === _this.htmlComponent.value; });
                    }
                    this.dirty = false;
                }
            }
            return this._value;
        },
        set: function (value) {
            this._value = value;
            if (!this.ignore) {
                this.propertyChange = new CustomEvent(this.propertyChangeEvent, { detail: this });
                document.dispatchEvent(this.propertyChange);
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindableProperty.prototype, "objectValue", {
        get: function () {
            return this._objectValue;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindableProperty.prototype, "stringValue", {
        /*get objectValue(): any {
            if (this.value && typeof (this.value) == "string" && this.value.indexOf("#JSON#") == 0){
                var obj = JSON.parse(this.value.slice(6));
    
                if (obj.hasOwnProperty('mutated-accesors')) {
                    var auxAccesors = obj['mutated-accesors'];
                    obj['mutated-accesors'] = [];
                    for (var i in auxAccesors) {
                        var mutatedProp = auxAccesors[i];
                        var oldProp = obj['_' + mutatedProp];
                        ModelProperty.createAccesorProperty(mutatedProp, obj,
                            new BindableProperty(mutatedProp, oldProp["_internalExpression"], oldProp["_value"], obj));
                    }
                }
    
                return obj;
            }
            else
                return this.value;
        }*/
        get: function () {
            var result = "";
            if (typeof this.value == "object")
                result = JSON.stringify(this.originalObject(this.value));
            else
                result = this.value.toString();
            return result;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindableProperty.prototype, "internalValue", {
        set: function (value) {
            this._value = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindableProperty.prototype, "propertyChangeEvent", {
        get: function () {
            return "propertyChange" + this.name;
        },
        enumerable: true,
        configurable: true
    });
    BindableProperty.prototype.dispatchChangeEvent = function (argName) {
        if (this.ignore)
            return;
        if (this.dispatchEvents.indexOf(this.propertyChangeEvent) !== -1)
            return;
        if (argName)
            this._externalReference = argName;
        this.dirty = true;
        this.dispatchEvents.push(this.propertyChangeEvent);
        this.propertyChange = new CustomEvent(this.propertyChangeEvent, { detail: this });
        document.dispatchEvent(this.propertyChange);
    };
    BindableProperty.prototype.originalObject = function (value) {
        var ori = null;
        if (Array.isArray(value) || value instanceof ObservableArray)
            ori = [];
        else
            ori = {};
        if (value.hasOwnProperty('mutated-accesors')) {
            var auxAccesors = value['mutated-accesors'];
            for (var i in auxAccesors) {
                var mutatedProp = auxAccesors[i];
                if (mutatedProp.indexOf('#') === -1 && mutatedProp.indexOf('@') === -1) {
                    var internalVal = null;
                    if (value[mutatedProp] instanceof BindableProperty)
                        internalVal = value[mutatedProp].stringValue;
                    else if (typeof value[mutatedProp] === "object")
                        internalVal = this.originalObject(value[mutatedProp]);
                    else
                        internalVal = value[mutatedProp];
                    if (Array.isArray(ori))
                        ori.push(internalVal);
                    else
                        ori[mutatedProp] = internalVal;
                }
            }
        }
        else if (Array.isArray(value) || value instanceof ObservableArray) {
            for (var j = 0; j < value.length; j++)
                ori.push(this.originalObject(value[j]));
        }
        else
            ori = value;
        return ori;
    };
    return BindableProperty;
})();
