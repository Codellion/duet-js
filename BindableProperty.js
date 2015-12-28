/// <reference path="ObservableArray.ts" />
/// <reference path="ModelProperty.ts" />
var BindableProperty = (function () {
    function BindableProperty(propertyName, hashEventName, value, parentValue) {
        this.dirty = false;
        this.name = propertyName;
        this._tempValue = null;
        this._parentValue = parentValue;
        this.hashEventName = hashEventName;
        this.propertyChange = new CustomEvent(this.propertyChangeEvent, { detail: this });
        if (Array.isArray(value) || value instanceof ObservableArray) {
            if (Array.isArray(value)) {
                var obsArr = new ObservableArray(propertyName);
                this._tempValue = value;
                this.value = obsArr;
            }
            else
                this.value = value;
        }
        else {
            this.value = value;
        }
    }
    Object.defineProperty(BindableProperty.prototype, "value", {
        get: function () {
            if (this._parseInProgress)
                return null;
            if (this.name.indexOf('#') == 0) {
                var result = this.evalInContext(this.name.slice(1), this._parentValue);
                if (typeof result == "object") {
                    this._parseInProgress = true;
                    var cache = [];
                    result = JSON.stringify(result, function (key, value) {
                        if (typeof value === 'object' && value !== null) {
                            if (cache.indexOf(value) !== -1) {
                                // Circular reference found, discard key
                                return;
                            }
                            // Store value in our collection
                            cache.push(value);
                        }
                        return value;
                    });
                    cache = null;
                    this._parseInProgress = false;
                    result = "#JSON#" + result;
                }
                return result;
            }
            else {
                return this._value;
            }
        },
        set: function (value) {
            this._value = value;
            if (Array.isArray(this._value) || this._value instanceof ObservableArray)
                this.dirty = true;
            document.dispatchEvent(this.propertyChange);
            this.dirty = false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindableProperty.prototype, "objectValue", {
        get: function () {
            if (this.value && typeof (this.value) == "string" && this.value.indexOf("#JSON#") == 0) {
                var obj = JSON.parse(this.value.slice(6));
                if (obj.hasOwnProperty('mutated-accesors')) {
                    var auxAccesors = obj['mutated-accesors'];
                    obj['mutated-accesors'] = [];
                    for (var i in auxAccesors) {
                        var mutatedProp = auxAccesors[i];
                        var oldProp = obj['_' + mutatedProp];
                        ModelProperty.createAccesorProperty(mutatedProp, obj, new BindableProperty(mutatedProp, oldProp["_hashEventName"], oldProp["_value"], obj));
                    }
                }
                return obj;
            }
            else
                return this.value;
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
    Object.defineProperty(BindableProperty.prototype, "hashEventName", {
        get: function () {
            return this._hashEventName;
        },
        set: function (value) {
            this._hashEventName = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindableProperty.prototype, "propertyChangeEvent", {
        get: function () {
            return "propertyChange" + this.hashEventName;
        },
        enumerable: true,
        configurable: true
    });
    BindableProperty.prototype.evalInContext = function (js, context) {
        return function () { return eval(js); }.call(context);
    };
    BindableProperty.prototype.dispatchChangeEvent = function () {
        if (this._tempValue != null && this.value instanceof ObservableArray) {
            this.value.initialize(this._tempValue);
            this._tempValue = null;
        }
        document.dispatchEvent(this.propertyChange);
    };
    return BindableProperty;
})();
