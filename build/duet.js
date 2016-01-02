/// <reference path="ObservableArray.ts" />
/// <reference path="ModelProperty.ts" />
/// <reference path="DynamicCode.ts" />
var BindableProperty = (function () {
    function BindableProperty(propertyName, internalExpression, value, parentValue, isIndependent) {
        this.dirty = false;
        this.name = propertyName;
        this._internalExpression = internalExpression;
        this._tempValue = null;
        this._parentValue = parentValue;
        this._externalReference = null;
        this.propertyChange = new CustomEvent(this.propertyChangeEvent, { detail: this });
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
            if (this._parseInProgress)
                return null;
            var propName = this.name;
            if ((this._internalExpression.indexOf('#') == 0 || this._internalExpression.indexOf('@') == 0) && this.dirty == true) {
                var func = this._internalExpression.slice(1);
                var result = null;
                if (func.indexOf("=>") != -1)
                    func = DynamicCode.parseLambdaExpression(func);
                if (this._internalExpression.indexOf('@') == 0) {
                    this._eventExpresion = func;
                    var _this = this;
                    result = (function () {
                        window["dt-dispatchEvents"] = [];
                        return DynamicCode.evalInContext(_this._eventExpresion, _this._parentValue);
                    });
                }
                else {
                    result = DynamicCode.evalInContext(func, this._parentValue);
                }
                this._value = result;
                this.dirty = false;
                return result;
            }
            else {
                return this._value;
            }
        },
        set: function (value) {
            this._value = value;
            document.dispatchEvent(this.propertyChange);
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
                        ModelProperty.createAccesorProperty(mutatedProp, obj, new BindableProperty(mutatedProp, oldProp["_internalExpression"], oldProp["_value"], obj));
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
    Object.defineProperty(BindableProperty.prototype, "propertyChangeEvent", {
        get: function () {
            return "propertyChange" + this.name;
        },
        enumerable: true,
        configurable: true
    });
    BindableProperty.prototype.dispatchChangeEvent = function (argName) {
        if (this.dispatchEvents.indexOf(this.propertyChangeEvent) !== -1)
            return;
        if (argName)
            this._externalReference = argName;
        this.dirty = true;
        var elIndex = this.dispatchEvents.push(this.propertyChangeEvent);
        document.dispatchEvent(this.propertyChange);
    };
    return BindableProperty;
})();

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


/// <reference path="ModelView.ts" />
/// <reference path="BindableProperty.ts" />
var ModelProperty = (function () {
    function ModelProperty(modelView, component) {
        var _this = this;
        this.modelView = modelView;
        this.component = component;
        this.componentBindings = {};
        this.pendingSync = {};
        this.internalBindings = {};
        var binding = false;
        for (var name in this.component.dataset) {
            if (this.component.dataset.hasOwnProperty(name) && name.indexOf("dt") == 0) {
                if (name.length > 2) {
                    var bindName = name[2].toLowerCase() + name.slice(3);
                    var bindValue = this.component.dataset[name];
                    bindName = bindName.replace("html", "HTML");
                    if (bindValue.indexOf('#') === -1)
                        bindValue = bindValue.replace('.', '|');
                    this.componentBindings[bindName] = this.modelView.modelName + "|" + bindValue;
                    binding = true;
                }
            }
            if (this.component[bindName] != undefined && this.component[bindName].length > 0
                && this.component[bindName][0] instanceof HTMLElement) {
                var node = this.component[bindName][0];
                this._template = node;
                this.component.removeChild(node);
            }
        }
        if (binding) {
            this.createPropertyBinding();
            for (var bindableProp in this.componentBindings) {
                var propName = this.componentBindings[bindableProp];
                var bindProperty = this.bindings[propName];
                this.listenChangeEvents(propName, bindProperty);
            }
            this.component.addEventListener("componentSync", function (e) {
                if (e instanceof CustomEvent && e.detail instanceof ModelProperty) {
                    var mdProp = e.detail;
                    var comp = mdProp.component;
                    for (var pendChange in mdProp.pendingSync) {
                        var binding = _this.bindings[_this.componentBindings[pendChange]];
                        var internalComponent = _this.component;
                        if (pendChange.indexOf('.') != -1) {
                            var internalProps = pendChange.split('.');
                            pendChange = internalProps[internalProps.length - 1];
                            internalProps = internalProps.slice(0, internalProps.length - 1);
                            internalProps.forEach(function (n) {
                                if (!internalComponent[n])
                                    internalComponent[n] = {};
                                internalComponent = internalComponent[n];
                            });
                        }
                        if (binding != undefined && internalComponent[pendChange] != undefined
                            && binding.value != internalComponent[pendChange]) {
                            binding.value = internalComponent[pendChange];
                        }
                    }
                }
            }, false);
        }
        this.componentSync = new CustomEvent("componentSync", { detail: this });
    }
    Object.defineProperty(ModelProperty.prototype, "dispatchEvents", {
        get: function () {
            if (!window["dt-dispatchEvents"])
                window["dt-dispatchEvents"] = [];
            return window["dt-dispatchEvents"];
        },
        set: function (value) {
            window["dt-dispatchEvents"] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ModelProperty.prototype, "bindings", {
        get: function () {
            return this._modelView.bindings;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ModelProperty.prototype, "modelView", {
        get: function () {
            return this._modelView;
        },
        set: function (value) {
            this._modelView = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ModelProperty.prototype, "component", {
        get: function () {
            return this._component;
        },
        set: function (value) {
            var _this = this;
            var instance = this;
            this._component = value;
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) { return _this.syncComponentChange(mutation.target, mutation.attributeName); });
                _this.syncDependencies(instance);
            });
            var config = { attributes: true, childList: false, characterData: true };
            observer.observe(this._component, config);
            this._component.onchange = function () {
                ModelProperty.syncComponentEvent(instance);
            };
            this._component.onkeydown = function () {
                ModelProperty.syncComponentEvent(instance);
            };
            this._component.onkeyup = function () {
                ModelProperty.syncComponentEvent(instance);
            };
        },
        enumerable: true,
        configurable: true
    });
    ModelProperty.prototype.listenChangeEvents = function (propName, bindProperty) {
        var _this = this;
        document.addEventListener(bindProperty.propertyChangeEvent, function (e) { return _this.onBindingChange(e); }, false);
        if (this.bindings[propName].objectValue instanceof ObservableArray) {
            document.addEventListener(propName + "elementAdded", function (e) {
                if (e.detail instanceof ObservableItem) {
                    var prop = _this.getComponentBinding(e.detail.name);
                    _this.bindingObservableItem(e.detail.name, e.detail.index, e.detail.item, prop);
                }
            });
            document.addEventListener(propName + "elementRemoved", function (e) {
                if (e.detail instanceof ObservableItem) {
                    var prop = _this.getComponentBinding(e.detail.name);
                    if (prop != null) {
                        if (_this.component[prop][e.detail.index].remove)
                            _this.component[prop][e.detail.index].remove();
                        else
                            _this.component.removeChild(_this.component.children[e.detail.index]);
                    }
                }
            });
        }
    };
    ModelProperty.prototype.syncDependencies = function (instance) {
        if (!this.modelView.isInitialization)
            instance.component.dispatchEvent(instance.componentSync);
        instance.pendingSync = {};
    };
    ModelProperty.prototype.onBindingChange = function (args) {
        args.preventDefault();
        this.setComponentBinding(args.detail);
        if (!this.modelView.isInitialization) {
            this.modelView.checkBindDependencies(args);
        }
    };
    ModelProperty.prototype.bindingObservableItem = function (propName, index, item, bindName) {
        if (!this.bindings[propName] || this._template == undefined)
            return;
        var newModelName = this.modelView.modelName + "|" + propName + "|" + index;
        if (this.modelView.subModels.some(function (n) { return n.modelName === newModelName; })) {
            var subIndex = null;
            var i = -1;
            this.modelView.subModels.forEach(function (n) {
                i++;
                if (n.modelName == newModelName) {
                    subIndex = i;
                }
            });
            if (subIndex > -1) {
                this.modelView.subModels[subIndex].bindings = {};
                this.modelView.subModels.splice(subIndex, 1);
            }
        }
        var element = this._template.cloneNode(true);
        this.component.appendChild(element);
        var newModel = new ModelView(newModelName, item, element, bindName);
        this.modelView.subModels.push(newModel);
    };
    ModelProperty.prototype.getComponentBinding = function (bindName) {
        var prop = "";
        for (var bind in this.componentBindings)
            if (bindName == this.componentBindings[bind]) {
                prop = bind;
                break;
            }
        return prop;
    };
    ModelProperty.prototype.syncComponentChange = function (comp, attrName) {
        if (comp instanceof HTMLElement) {
            for (var compBind in this.componentBindings) {
                var auxCompBind = compBind;
                if (compBind.indexOf('.') != -1)
                    auxCompBind = auxCompBind.split('.')[0];
                if (auxCompBind === attrName) {
                    var internalComponent = comp;
                    if (compBind.indexOf('.') != -1) {
                        var internalProps = compBind.split('.');
                        auxCompBind = internalProps[internalProps.length - 1];
                        internalProps = internalProps.slice(0, internalProps.length - 1);
                        internalProps.forEach(function (n) {
                            if (!internalComponent[n])
                                internalComponent[n] = {};
                            internalComponent = internalComponent[n];
                        });
                    }
                    this.pendingSync[compBind] = internalComponent[auxCompBind];
                    break;
                }
            }
        }
    };
    ModelProperty.prototype.createPropertyBinding = function () {
        for (var propKey in this.componentBindings) {
            var propertyName = this.componentBindings[propKey];
            var result = null;
            if (this.bindings && this.bindings[propertyName]) {
                result = this.bindings[propertyName];
                this.internalBindings[propertyName] = result;
            }
            else {
                var source = this.modelView.model;
                var parentPropName = "";
                var propName = propertyName;
                if (propName.indexOf('|') !== -1) {
                    propName = propName.replace(this.modelView.modelName + '|', '');
                    if (propName.indexOf('#') === -1)
                        propName = propName.replace('|', '.');
                }
                if (propName.indexOf('#') != 0 && propName.indexOf('@') != 0 && propName.indexOf('.') != -1) {
                    var internalProps = propName.split('.');
                    parentPropName = internalProps[internalProps.length - 2];
                    propName = internalProps[internalProps.length - 1];
                    internalProps = internalProps.slice(0, internalProps.length - 1);
                    internalProps.forEach(function (n) {
                        if (!source[n])
                            source[n] = {};
                        source = source[n];
                    });
                }
                result = new BindableProperty(propertyName, propName, source[propName], source);
                ModelProperty.createAccesorProperty(propName, source, result);
                if (!this.bindings)
                    this.bindings = {};
                this.internalBindings[propertyName] = result;
                this.bindings[propertyName] = result;
            }
        }
    };
    ModelProperty.prototype.setComponentBinding = function (binding) {
        binding.dirty = true;
        var internalComponent = this.component;
        var prop = this.getComponentBinding(binding.name);
        if (prop != null && prop.indexOf('.') != -1) {
            var internalProps = prop.split('.');
            prop = internalProps[internalProps.length - 1];
            internalProps = internalProps.slice(0, internalProps.length - 1);
            internalProps.forEach(function (n) {
                if (!internalComponent[n])
                    internalComponent[n] = {};
                internalComponent = internalComponent[n];
            });
        }
        if (typeof (internalComponent[prop]) != undefined) {
            if (internalComponent[prop] != null && internalComponent[prop].__proto__ == HTMLCollection.prototype) {
                if (binding.dirty) {
                    for (var j = internalComponent[prop].length - 1; j > -1; j--) {
                        if (internalComponent[prop][j].remove)
                            internalComponent[prop][j].remove();
                        else
                            this.component.removeChild(this.component.children[j]);
                    }
                    if (Array.isArray(binding.objectValue) || binding.objectValue instanceof ObservableArray) {
                        for (var i = 0; i < binding.objectValue.length; i++)
                            this.bindingObservableItem(binding.name, i, binding.objectValue[i], prop);
                    }
                    else {
                        this.bindingObservableItem(binding.name, 0, binding.objectValue, prop);
                    }
                }
            }
            else if (typeof (binding.value) !== "undefined")
                internalComponent[prop] = binding.value;
        }
    };
    ModelProperty.createAccesorProperty = function (propertyName, source, property) {
        if (source['mutated-accesors'] && source['mutated-accesors'].indexOf(propertyName) != -1)
            return;
        var privateProp = "_" + propertyName;
        source[privateProp] = property;
        Object.defineProperty(source, propertyName, {
            get: function () {
                return this[privateProp].value;
            },
            set: function (value) {
                this[privateProp].value = value;
            },
            enumerable: true,
            configurable: true
        });
        /*Object.defineProperty(source, "$" + propertyName, {
            get: function() {
                return this[privateProp].objectValue;
            },
            enumerable: true,
            configurable: true
        });*/
        if (!source['mutated-accesors'])
            source['mutated-accesors'] = [];
        source['mutated-accesors'].push(propertyName);
    };
    ModelProperty.syncComponentEvent = function (instance) {
        instance.dispatchEvents = [];
        for (var compBind in instance.componentBindings) {
            if (typeof (instance.component[compBind]) != undefined)
                instance.pendingSync[compBind] = instance.component[compBind];
        }
        instance.syncDependencies(instance);
    };
    return ModelProperty;
})();

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
                this.createObservableObject(this.model, this.modelName);
            else {
                var auxAccesor = model["mutated-accesors"];
                for (var i in auxAccesor) {
                    var newBindName = this.modelName + '|' + auxAccesor[i];
                    var oldBind = model["_" + auxAccesor[i]];
                    oldBind.name = this.modelName + '|' + auxAccesor[i];
                    this.bindings[newBindName] = oldBind;
                }
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
        if (typeof (obj) !== "object" || (obj && obj["mutated-observation"]))
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
                var propertyBindName = parentPropName + "|" + propertyName;
                var result = this.bindings[propertyBindName];
                if (typeof (result) === "undefined") {
                    result = new BindableProperty(propertyBindName, propertyName, obj[propertyName], obj, true);
                }
                ModelProperty.createAccesorProperty(propertyName, obj, result);
                this.createObservableObject(obj[propertyName], propertyBindName);
                this.bindings[propertyBindName] = result;
                document.addEventListener(result.propertyChangeEvent, function (args) {
                    if (!_this.isInitialization) {
                        _this.checkBindDependencies(args);
                        if (obj["_parentReference"] && obj["_parentReference"]._binding) {
                            _this.dispatchEvents.push(args.detail.propertyChangeEvent);
                            obj["_parentReference"]._binding.dispatchChangeEvent(args.detail.internalExpression);
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
        if (name.indexOf('|') !== -1) {
            name = name.replace(this.modelName + '|', '').replace('|', '.');
        }
        if (name.indexOf('#') == 0)
            return;
        for (var bindingName in this.bindings) {
            var binding = this.bindings[bindingName];
            if (binding.internalExpression.indexOf('#') == 0 && binding.internalExpression !== name) {
                if (this.containsBindReference(binding.internalExpression, name))
                    binding.dispatchChangeEvent();
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

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="ObservableItem.ts" />
/// <reference path="BindableProperty.ts" />
var ObservableArray = (function (_super) {
    __extends(ObservableArray, _super);
    function ObservableArray(name, binding) {
        var _self = this;
        _super.call(this);
        this._name = name;
        if (binding)
            this._binding = binding;
        else
            this._binding = null;
    }
    Object.defineProperty(ObservableArray.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ObservableArray.prototype, "propertyChangeEvent", {
        get: function () {
            return "propertyChange" + this.name;
        },
        enumerable: true,
        configurable: true
    });
    ObservableArray.prototype.initialize = function (items) {
        var _this = this;
        items.forEach(function (n) { return _super.prototype.push.call(_this, n); });
    };
    ObservableArray.prototype.push = function () {
        var _this = this;
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        var res = 0;
        items.forEach(function (n) {
            n["_parentReference"] = _this;
            res = _super.prototype.push.call(_this, n);
            if (_this._binding === null) {
                _this.elementAdded = new CustomEvent(_this.name + "elementAdded", { detail: new ObservableItem(_this.name, n, res) });
                document.dispatchEvent(_this.elementAdded);
            }
            else
                _this._binding.dispatchChangeEvent(null);
        });
        return res;
    };
    ObservableArray.prototype.pop = function () {
        var index = this.length - 1;
        var res = _super.prototype.pop.call(this);
        if (this._binding === null) {
            this.elementRemoved = new CustomEvent(this.name + "elementRemoved", { detail: new ObservableItem(this.name, res, index) });
            document.dispatchEvent(this.elementRemoved);
        }
        else
            this._binding.dispatchChangeEvent(null);
        return res;
    };
    ObservableArray.prototype.unshift = function () {
        var _this = this;
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        var res = 0;
        items.forEach(function (n) {
            n["_parentReference"] = _this;
            res = _super.prototype.unshift.call(_this, n);
            if (_this._binding) {
                _this.elementAdded = new CustomEvent(_this.name + "elementAdded", { detail: new ObservableItem(_this.name, n, res) });
                document.dispatchEvent(_this.elementAdded);
            }
            else
                _this._binding.dispatchChangeEvent(null);
        });
        return res;
    };
    ObservableArray.prototype.shift = function () {
        var res = _super.prototype.shift.call(this);
        if (this._binding === null) {
            this.elementRemoved = new CustomEvent(this.name + "elementRemoved", { detail: new ObservableItem(this.name, res, 0) });
            document.dispatchEvent(this.elementRemoved);
        }
        else
            this._binding.dispatchChangeEvent(null);
        return res;
    };
    ObservableArray.prototype.change = function (index, value) {
        var origin = this[index];
        for (var prop in origin) {
            if (value[prop])
                origin[prop] = value[prop];
        }
    };
    return ObservableArray;
})(Array);

var ObservableItem = (function () {
    function ObservableItem(name, item, index) {
        this.name = name;
        this.item = item;
        this.index = index;
    }
    return ObservableItem;
})();