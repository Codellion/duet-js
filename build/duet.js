var ObservableItem = (function () {
    function ObservableItem(name, item, index) {
        this.name = name;
        this.item = item;
        this.index = index;
    }
    return ObservableItem;
})();
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ObservableArray = (function (_super) {
    __extends(ObservableArray, _super);
    function ObservableArray(name, binding) {
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
            if (_this._binding === null) {
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
    ObservableArray.prototype.splice = function (start, deleteCount) {
        var _this = this;
        var items = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            items[_i - 2] = arguments[_i];
        }
        var res = null;
        if (items && items.length > 0)
            res = Array.prototype.splice.call(this, start, deleteCount, items);
        else
            res = Array.prototype.splice.call(this, start, deleteCount);
        res.forEach(function (n) {
            if (_this._binding === null) {
                _this.elementRemoved = new CustomEvent(_this.name + "elementRemoved", { detail: new ObservableItem(_this.name, n, 0) });
                document.dispatchEvent(_this.elementRemoved);
            }
            else
                _this._binding.dispatchChangeEvent(null);
        });
        return res;
    };
    ObservableArray.prototype.change = function (index, value) {
        if (typeof (value) === 'object') {
            var origin = this[index];
            for (var prop in origin) {
                if (value[prop])
                    origin[prop] = value[prop];
            }
        }
        else {
            this[index] = value;
            this._binding.dispatchChangeEvent(null);
        }
    };
    return ObservableArray;
})(Array);
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
    function ModelView(modelName, model, elementContainer, elementModel, oriModel) {
        var _this = this;
        this.modelName = modelName;
        this.properties = new Array();
        if (!this.bindings)
            this.bindings = {};
        this.subModels = new Array();
        this.isInitialization = true;
        if (oriModel)
            this.originalModel = oriModel;
        else
            this.originalModel = this;
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
        else {
            this.model = {};
        }
        if (modelName) {
            var docElements = [];
            if (elementContainer) {
                docElements = this.getAllDuetNodes(elementContainer);
                var mdContainer = new ModelProperty(this, elementContainer);
                this.properties.push(mdContainer);
            }
            else
                docElements = this.getAllDuetNodes();
            if (docElements.length > 0) {
                docElements.forEach(function (element, index) {
                    var newProperty = new ModelProperty(_this, element);
                    _this.properties.push(newProperty);
                });
            }
            this.properties.forEach(function (n) {
                for (var bindName in n.internalBindings)
                    n.setComponentBinding(n.bindings[bindName]);
            });
        }
        this.isInitialization = false;
    }
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
    ModelView.prototype.unbind = function () {
        this.bindings = {};
        this.properties.forEach(function (n) { return n.isUnbind = true; });
        this._isUnbind = true;
        this.subModels.forEach(function (subMd) { return subMd.unbind(); });
    };
    ModelView.prototype.getAllDuetNodes = function (element) {
        if (!element)
            element = document;
        var dom = element.getElementsByTagName('*');
        var res = [];
        var resParent = [];
        for (var i = 0; i < dom.length; i++) {
            var domObj = dom[i];
            var domFound = false;
            if (domObj.attributes.hasOwnProperty("dt") || domObj.attributes.hasOwnProperty("data-dt")) {
                if (domObj.attributes.hasOwnProperty("dt")) {
                    validNode = domObj.attributes["dt"].value == this.originalModel.modelName;
                }
                else if (domObj.attributes.hasOwnProperty("data-dt")) {
                    validNode = domObj.attributes["data-dt"].value == this.originalModel.modelName;
                }
            }
            else
                validNode = "duet.model" == this.originalModel.modelName;
            if (validNode) {
                for (var j = 0; j < domObj.attributes.length && !domFound; j++) {
                    var attr = domObj.attributes[j];
                    var attrName = attr.name;
                    var validNode = true;
                    if (attr.name.indexOf('data-') == 0) {
                        attrName = attr.name.slice(5);
                    }
                    if (attrName.indexOf('dt') == 0 || attrName.indexOf('dt') == 0 && attrName != "dt-binding-generation") {
                        var isSubElement = false;
                        for (var k = 0; k < resParent.length && !isSubElement; k++) {
                            isSubElement = resParent[k].contains(domObj);
                        }
                        if (!isSubElement) {
                            res.push(domObj);
                            if (domObj.hasAttribute('dt-children') || domObj.hasAttribute('data-dt-children'))
                                resParent.push(domObj);
                        }
                        domFound = true;
                    }
                }
            }
        }
        return res;
    };
    ModelView.prototype.createObservableObject = function (obj, parentName) {
        if (typeof (obj) !== "object" || (obj && obj["mutated-observation"]))
            return;
        var instance = this;
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
                    result = new BindableProperty(propertyBindName, propertyName, obj[propertyName], obj, this.originalModel.model, null, true);
                }
                ModelProperty.createAccesorProperty(propertyName, obj, result);
                this.createObservableObject(obj[propertyName], propertyBindName);
                this.bindings[propertyBindName] = result;
                document.addEventListener(result.propertyChangeEvent, function (args) {
                    if (instance._isUnbind) {
                        document.removeEventListener(result.propertyChangeEvent, arguments.callee, false);
                        return;
                    }
                    if (!instance.isInitialization) {
                        instance.checkBindDependencies(args);
                        if (obj["_parentReference"] && obj["_parentReference"]._binding) {
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
        var name = args.detail.internalExpression;
        if (args.detail["_externalReference"] && args.detail["_externalReference"] != null)
            name = args.detail["_externalReference"];
        for (var bindingName in this.bindings) {
            var binding = this.bindings[bindingName];
            if ((binding.internalExpression.indexOf('#') == 0 || binding.isFunction) && binding.internalExpression !== name) {
                var expr = binding.internalExpression;
                if (binding.isFunction)
                    expr = binding.funcDefinition;
                if (binding.references.indexOf(name) !== -1)
                    binding.dispatchChangeEvent();
                else {
                    if (this.containsBindReference(expr, name)) {
                        binding.dispatchChangeEvent();
                        binding.references.push(name);
                    }
                    else if (this.containsBindReference(expr, '$' + name)) {
                        binding.dispatchChangeEvent();
                        binding.references.push(name);
                    }
                    else if (this.containsBindReference(expr, name + '_stringify')) {
                        binding.dispatchChangeEvent();
                        binding.references.push(name);
                    }
                }
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
var ModelProperty = (function () {
    function ModelProperty(modelView, component) {
        this.modelView = modelView;
        this.component = component;
        this.componentBindings = {};
        this.pendingSync = {};
        this.internalBindings = {};
        var binding = false;
        this.createDatasetAttributes(this.component);
        for (var name in this.component.dataset) {
            if (this.component.dataset.hasOwnProperty(name) && name.indexOf("dt") == 0) {
                if (name.length > 2) {
                    var bindName = name[2].toLowerCase() + name.slice(3);
                    var bindValue = this.component.dataset[name].trim();
                    bindName = bindName.replace("html", "HTML");
                    if (bindName !== "bindingGeneration") {
                        if (bindValue.indexOf('#') === -1)
                            bindValue = bindValue.replace('.', '|');
                        this.componentBindings[bindName] = this.modelView.modelName + "|" + bindValue;
                        binding = true;
                    }
                }
            }
            if (typeof this.component[bindName] !== "undefined" && this.component[bindName] != null && this.component[bindName].length > 0
                && this.component[bindName][0] instanceof HTMLElement) {
                var node = this.component[bindName][0];
                if (typeof node === "function") {
                    this._template = node.contentDocument.body.children[0];
                }
                else {
                    this._template = node;
                }
                var allTPElem = this._template.querySelectorAll('*');
                for (var iAlltp = 0; iAlltp < allTPElem.length; iAlltp++)
                    this.createDatasetAttributes(allTPElem[iAlltp]);
                node.dataset["dtBindingGeneration"] = undefined;
                this.createDatasetAttributes(node);
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
            var instance = this;
            this.component.addEventListener("componentSync", function (e) {
                if (e instanceof CustomEvent && e.detail instanceof ModelProperty) {
                    var mdProp = e.detail;
                    var comp = mdProp.component;
                    if (mdProp.isUnbind) {
                        mdProp.component.removeEventListener("componentSync", arguments.callee, false);
                        return;
                    }
                    var internalComponent = instance.component;
                    for (var pendChange in mdProp.pendingSync) {
                        var binding = instance.bindings[instance.componentBindings[pendChange]];
                        var propName = pendChange;
                        if (propName.indexOf('.') != -1) {
                            var internalProps = propName.split('.');
                            propName = internalProps[internalProps.length - 1];
                            internalProps = internalProps.slice(0, internalProps.length - 1);
                            internalProps.forEach(function (n) {
                                if (!internalComponent[n])
                                    internalComponent[n] = {};
                                internalComponent = internalComponent[n];
                            });
                        }
                        binding.htmlComponent = internalComponent;
                        if (binding != undefined && !binding.ignore
                            && mdProp.pendingSync[pendChange] != undefined
                            && binding.value != mdProp.pendingSync[pendChange]) {
                            binding.value = mdProp.pendingSync[pendChange];
                        }
                    }
                }
            }, false);
        }
        this.componentSync = new CustomEvent("componentSync", { detail: this });
    }
    Object.defineProperty(ModelProperty.prototype, "bindings", {
        get: function () {
            return this._modelView.bindings;
        },
        set: function (value) {
            this._modelView.bindings = value;
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
    Object.defineProperty(ModelProperty.prototype, "template", {
        get: function () {
            return this._template;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ModelProperty.prototype, "isUnbind", {
        get: function () {
            return this._isUnbind;
        },
        set: function (value) {
            if (this._observer && value)
                this._observer.disconnect();
            this._isUnbind = value;
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
            this._observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (mutation.type === "childList") {
                        var childrenMap = _this._component.dataset["childrenmap"];
                        if (_this.modelView.isInitialization)
                            return;
                        if (childrenMap && _this._template) {
                            var propToMap = _this.modelView.model[childrenMap];
                            var addNodes = new Array();
                            if (!propToMap)
                                propToMap = [];
                            for (var i = 0; i < mutation.addedNodes.length; i++) {
                                if (mutation.addedNodes[i] instanceof HTMLElement) {
                                    var childNode = mutation.addedNodes[i];
                                    if (!childNode.dataset["dtBindingGeneration"]) {
                                        _this.addChildrenListNode(propToMap, childNode, _this._template);
                                        addNodes.push(mutation.addedNodes[i]);
                                    }
                                }
                            }
                            for (var i = 0; i < addNodes.length; i++)
                                if (addNodes[i].parentNode != null)
                                    addNodes[i].parentNode.removeChild(addNodes[i]);
                            for (var i = 0; i < mutation.removedNodes.length; i++) {
                                if (mutation.removedNodes[i] instanceof HTMLElement) {
                                    var childNode = mutation.removedNodes[i];
                                    if (childNode.dataset["dtBindingGeneration"] && childNode.dataset["dtBindingGeneration"] != "undefined") {
                                        propToMap.splice(parseInt(childNode.dataset["dtBindingGeneration"]), 1);
                                    }
                                }
                            }
                        }
                    }
                    else {
                        _this.syncComponentChange(mutation.target, mutation.attributeName);
                    }
                });
                _this.syncDependencies(instance);
            });
            var config = { attributes: true, childList: true, characterData: true };
            this._observer.observe(this._component, config);
            this._component.addEventListener("change", function () {
                if (instance.isUnbind)
                    instance._component.removeEventListener("change", arguments.callee, false);
                else
                    ModelProperty.syncComponentEvent(instance);
            }, false);
            this._component.addEventListener("keydown", function () {
                if (instance.isUnbind)
                    instance._component.removeEventListener("keydown", arguments.callee, false);
                else
                    ModelProperty.syncComponentEvent(instance);
            }, false);
            this._component.addEventListener("keyup", function () {
                if (instance.isUnbind)
                    instance._component.removeEventListener("keyup", arguments.callee, false);
                else
                    ModelProperty.syncComponentEvent(instance);
            }, false);
        },
        enumerable: true,
        configurable: true
    });
    ModelProperty.prototype.createDatasetAttributes = function (element) {
        for (var prop in element.attributes) {
            var attr = element.attributes[prop];
            if (attr.name && attr.name.indexOf("dt") == 0) {
                var attrName = attr.name;
                var iattrName = attrName.indexOf('-');
                while (iattrName != -1) {
                    attrName = attrName.replace(/-/, attrName[iattrName + 1].toUpperCase());
                    attrName = attrName.slice(0, iattrName + 1) + attrName.slice(iattrName + 2);
                    iattrName = attrName.indexOf('-');
                }
                element.dataset[attrName] = attr.value;
            }
        }
    };
    ModelProperty.prototype.listenChangeEvents = function (propName, bindProperty) {
        var instance = this;
        document.addEventListener(bindProperty.propertyChangeEvent, function (e) {
            if (instance.isUnbind) {
                document.removeEventListener(bindProperty.propertyChangeEvent, arguments.callee, false);
                return;
            }
            instance.onBindingChange(e);
        }, false);
        var internalComponent = this.component;
        var propInternalName = propName;
        if (propInternalName.indexOf('.') != -1) {
            var internalProps = propInternalName.split('.');
            propInternalName = internalProps[internalProps.length - 1];
            internalProps = internalProps.slice(0, internalProps.length - 1);
            internalProps.forEach(function (n) {
                if (!internalComponent[n])
                    internalComponent[n] = {};
                internalComponent = internalComponent[n];
            });
        }
        this.bindings[propName].htmlComponent = internalComponent;
        if (this.bindings[propName].value instanceof ObservableArray) {
            document.addEventListener(propName + "elementAdded", function (e) {
                if (instance.isUnbind) {
                    document.removeEventListener(propName + "elementAdded", arguments.callee, false);
                    return;
                }
                if (e.detail instanceof ObservableItem) {
                    var prop = instance.getComponentBinding(e.detail.name);
                    instance.bindingObservableItem(e.detail.name, e.detail.index, e.detail.item, prop);
                }
            });
            document.addEventListener(propName + "elementRemoved", function (e) {
                if (instance.isUnbind) {
                    document.removeEventListener(propName + "elementRemoved", arguments.callee, false);
                    return;
                }
                if (e.detail instanceof ObservableItem) {
                    var prop = instance.getComponentBinding(e.detail.name);
                    if (prop != null) {
                        instance.component[prop][e.detail.index].dataset["dtBindingGeneration"] = undefined;
                        if (instance.component[prop][e.detail.index].remove) {
                            instance.component[prop][e.detail.index].remove();
                        }
                        else {
                            instance.component.removeChild(instance.component.children[e.detail.index]);
                        }
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
        if (this._component instanceof HTMLSelectElement && this._template.dataset
            && (this._template.dataset['dtValue'] || this._template.dataset['dtText'])) {
            if (this._template.dataset['dtValue'])
                this.bindings[propName].selectValueProp = this._template.dataset['dtValue'];
            else
                this.bindings[propName].selectValueProp = this._template.dataset['dtText'];
        }
        var element = this._template.cloneNode(true);
        if (element instanceof HTMLElement)
            element.dataset["dtBindingGeneration"] = index.toString();
        this.component.appendChild(element);
        var newModel = new ModelView(newModelName, item, element, bindName, this.modelView.originalModel);
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
                result = new BindableProperty(propertyName, propName, source[propName], source, this.modelView.originalModel.model, this.component);
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
        binding.htmlComponent = internalComponent;
        if (typeof (internalComponent[prop]) !== "undefined") {
            if (internalComponent[prop] != null && internalComponent[prop].__proto__ == HTMLCollection.prototype) {
                if (binding.dirty) {
                    for (var j = internalComponent[prop].length - 1; j > -1; j--) {
                        internalComponent[prop][j].dataset["dtBindingGeneration"] = undefined;
                        if (internalComponent[prop][j].remove)
                            internalComponent[prop][j].remove();
                        else
                            this.component.removeChild(this.component.children[j]);
                    }
                    if (Array.isArray(binding.value) || binding.value instanceof ObservableArray) {
                        for (var i = 0; i < binding.value.length; i++)
                            this.bindingObservableItem(binding.name, i, binding.value[i], prop);
                    }
                    else {
                        this.bindingObservableItem(binding.name, 0, binding.value, prop);
                    }
                }
            }
            else if (typeof (binding.value) !== "undefined") {
                if (internalComponent['multiple'] && prop === "value") {
                    var lenght = internalComponent.children.length;
                    for (var i = 0; i < lenght; i++) {
                        if (binding.value != null && binding.value.indexOf(internalComponent.children[i]['value']) !== -1)
                            internalComponent.children[i]['selected'] = true;
                        else
                            internalComponent.children[i]['selected'] = false;
                    }
                }
                else {
                    internalComponent[prop] = binding.value;
                }
            }
        }
    };
    ModelProperty.prototype.addChildrenListNode = function (childList, childNode, template) {
        var templateDtElements = this._modelView.getAllDuetNodes(template);
        var nodeElements = childNode.querySelectorAll("*");
        var templateElements = template.querySelectorAll('*');
        var newModel = {};
        this.mapTemplateNode(newModel, template, childNode);
        for (var i = 0; i < templateElements.length; i++) {
            if (nodeElements.length < i)
                break;
            var _tplElem = templateElements[i];
            if (templateDtElements.indexOf(_tplElem) !== -1) {
                var _nodElem = nodeElements[i];
                if (_tplElem instanceof HTMLElement && _nodElem instanceof HTMLElement) {
                    var tplElem = _tplElem;
                    var nodElem = _nodElem;
                    this.mapTemplateNode(newModel, tplElem, nodElem);
                }
            }
        }
        childList.push(newModel);
    };
    ModelProperty.prototype.mapTemplateNode = function (newModel, tplElem, nodElem) {
        for (var name in tplElem.dataset) {
            if (tplElem.dataset.hasOwnProperty(name) && name.indexOf("dt") == 0) {
                if (name.length > 2) {
                    var bindName = name[2].toLowerCase() + name.slice(3);
                    var bindValue = tplElem.dataset[name].trim();
                    bindName = bindName.replace("html", "HTML");
                    if (bindName === "children" && nodElem[bindName]) {
                        var childrenMap = tplElem.dataset["childrenmap"];
                        if (!newModel[childrenMap]) {
                            newModel[childrenMap] = [];
                            for (var i = 0; i < nodElem[bindName].length; i++) {
                                var j = 0;
                                if (tplElem[bindName].length === nodElem[bindName].length)
                                    j = i;
                                this.addChildrenListNode(newModel[childrenMap], nodElem[bindName][i], tplElem[bindName][j]);
                            }
                        }
                    }
                    else if (bindValue.indexOf('#') === -1 && bindValue.indexOf('@') === -1
                        && nodElem[bindName]) {
                        newModel[bindValue] = nodElem[bindName];
                    }
                }
            }
        }
    };
    ModelProperty.createAccesorProperty = function (propertyName, source, property) {
        if (Array.isArray(source) || source instanceof ObservableArray || typeof (source) !== 'object')
            return;
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
        Object.defineProperty(source, "$" + propertyName, {
            get: function () {
                return this[privateProp].objectValue;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(source, propertyName + "_stringify", {
            get: function () {
                return this[privateProp].stringValue;
            },
            enumerable: true,
            configurable: true
        });
        if (!source['mutated-accesors'])
            source['mutated-accesors'] = [];
        source['mutated-accesors'].push(propertyName);
    };
    ModelProperty.syncComponentEvent = function (instance) {
        for (var compBind in instance.componentBindings) {
            if (typeof (instance.component[compBind]) !== "undefined"
                && instance.component[compBind].__proto__ !== HTMLCollection.prototype) {
                if (instance.component['multiple']) {
                    var lenght = instance.component.children.length;
                    var arrValue = [];
                    for (var i = 0; i < lenght; i++) {
                        if (instance.component.children[i]['selected']) {
                            arrValue.push(instance.component.children[i]['value']);
                        }
                    }
                    instance.pendingSync[compBind] = arrValue;
                }
                else
                    instance.pendingSync[compBind] = instance.component[compBind];
            }
        }
        instance.syncDependencies(instance);
    };
    return ModelProperty;
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
        this._funcDefinitionString = null;
        this._lastDispatchTime = null;
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
        else if (internalExpression === "this") {
            this.value = parentValue;
        }
        else {
            this.value = value;
        }
    }
    Object.defineProperty(BindableProperty.prototype, "funcDefinition", {
        get: function () {
            if (this._funcDefinitionString == null)
                this._funcDefinitionString = this._funcDefinition.toString().replace(' ', '');
            return this._funcDefinitionString;
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
    Object.defineProperty(BindableProperty.prototype, "value", {
        get: function () {
            var _this = this;
            var propName = this.name;
            if ((this._internalExpression.indexOf('#') == 0 || this._internalExpression.indexOf('@') == 0) && (typeof this.dirty === "undefined" || this.dirty == true)) {
                var result = null;
                var func = this._funcExpresion;
                if (func == null) {
                    func = this._internalExpression.slice(1);
                    if (func.indexOf("=>") != -1)
                        func = DynamicCode.parseLambdaExpression(func);
                }
                if (this._internalExpression.indexOf('@') == 0) {
                    if (this._eventExpresion == null)
                        this._eventExpresion = func;
                    var self = this;
                    result = (function () {
                        var scope = self._parentValue;
                        scope.model = self.model;
                        scope.view = self.htmlComponent;
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
                        var selectComp = this.htmlComponent;
                        if (!selectComp.multiple)
                            this._objectValue = this._parentValue[childProp].find(function (n) { return n[filterProp] === _this._value; });
                        else {
                            var arrValue = [];
                            if (this._value != null) {
                                if (!(this._value instanceof Array))
                                    this._value = [this._value];
                                var lenght = this._value.length;
                                for (var i = 0; i < lenght; i++) {
                                    arrValue.push(this._parentValue[childProp].find(function (n) { return n[filterProp] === _this._value[i]; }));
                                }
                            }
                            this._objectValue = arrValue;
                        }
                    }
                    this.dirty = false;
                }
            }
            return this._value;
        },
        set: function (value) {
            this._value = value;
            if (!this.ignore) {
                this.dispatchChangeEvent();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindableProperty.prototype, "objectValue", {
        get: function () {
            if (this.dirty)
                var temp = this.value;
            return this._objectValue;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BindableProperty.prototype, "stringValue", {
        get: function () {
            var result = "";
            if (this.objectValue != null || typeof this.objectValue == "object")
                result = JSON.stringify(this.originalObject(this.objectValue));
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
    Object.defineProperty(BindableProperty.prototype, "ignore", {
        get: function () {
            return this._ignore;
        },
        set: function (value) {
            if (this._ignore && !value) {
                this._ignore = value;
                this.dispatchChangeEvent();
            }
            else
                this._ignore = value;
        },
        enumerable: true,
        configurable: true
    });
    BindableProperty.prototype.dispatchChangeEvent = function (argName) {
        var _this = this;
        if (this._lastDispatchTime !== null && Date.now() - this._lastDispatchTime < 50) {
            if (!this._pendingEvent)
                this._pendingEvent = setTimeout(function () { return _this.dispatchChangeEvent(argName); }, 50);
            return;
        }
        clearTimeout(this._pendingEvent);
        this._pendingEvent = undefined;
        this._lastDispatchTime = Date.now();
        if (this.ignore)
            return;
        if (argName)
            this._externalReference = argName;
        else
            this._externalReference = null;
        this.dirty = true;
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
var duet = (function () {
    function duet() {
    }
    duet.bind = function (model, modelName) {
        if (!duet.subModels)
            duet.subModels = {};
        if (!duet.subModelViews)
            duet.subModelViews = {};
        if (!modelName)
            duet.model = model;
        else {
            duet.subModels[modelName] = model;
        }
        if (duet.readyComplete) {
            if (modelName) {
                if (duet.subModelViews[modelName]) {
                    duet.subModelViews[modelName].unbind();
                    duet.subModelViews[modelName] = undefined;
                }
                duet.subModelViews[modelName] = new ModelView(modelName, duet.subModels[modelName]);
            }
            else {
                if (duet.modelView)
                    duet.modelView.unbind();
                duet.modelView = new ModelView("duet.model", duet.model);
            }
        }
    };
    duet.init = function () {
        if (duet.readyBound)
            return;
        duet.readyBound = true;
        if (window.document.addEventListener) {
            window.document.addEventListener("DOMContentLoaded", function () {
                window.document.removeEventListener("DOMContentLoaded", arguments.callee, false);
                duet.ready();
            }, false);
        }
        else if (window.document.attachEvent) {
            window.document.attachEvent("onreadystatechange", function () {
                if (window.document.readyState === "complete") {
                    window.document.detachEvent("onreadystatechange", arguments.callee);
                    duet.ready();
                }
            });
            if (window.document.documentElement.doScroll && window == window.top)
                (function () {
                    if (duet.isReady)
                        return;
                    try {
                        window.document.documentElement.doScroll("left");
                    }
                    catch (error) {
                        setTimeout(arguments.callee, 0);
                        return;
                    }
                    duet.ready();
                })();
        }
        window.onload = duet.ready;
    };
    duet.ready = function () {
        if (!duet.isReady) {
            duet.isReady = true;
            if (duet.model)
                duet.modelView = new ModelView("duet.model", duet.model);
            for (var model in duet.subModels)
                duet.subModelViews[model] = new ModelView(model, duet.subModels[model]);
            duet.readyComplete = true;
        }
    };
    return duet;
})();
//# sourceMappingURL=duet.js.map