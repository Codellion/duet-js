/// <reference path="ModelView.ts" />
/// <reference path="BindableProperty.ts" />
var ModelProperty = (function () {
    function ModelProperty(modelView, component) {
        var _this = this;
        this.modelView = modelView;
        this.component = component;
        this.componentBindings = {};
        this.pendingSync = {};
        var binding = false;
        for (var name in this.component.dataset) {
            if (this.component.dataset.hasOwnProperty(name) && name.indexOf("mh") == 0) {
                if (name.length > 2) {
                    var bindName = name[2].toLowerCase() + name.slice(3);
                    var bindValue = this.component.dataset[name];
                    bindName = bindName.replace("html", "HTML");
                    this.componentBindings[bindName] = bindValue;
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
                document.addEventListener(bindProperty.propertyChangeEvent, function (e) { return _this.onBindingChange(e); }, false);
                if (this.bindings[propName].value instanceof ObservableArray) {
                    document.addEventListener(propName + "elementAdded", function (e) {
                        if (e.detail instanceof ObservableItem) {
                            _this.bindingObservableItem(e.detail.name, e.detail.index, e.detail.item);
                        }
                    });
                    document.addEventListener(propName + "elementRemoved", function (e) {
                        if (e.detail instanceof ObservableItem) {
                            var prop = null;
                            for (var bind in _this.componentBindings)
                                if (e.detail.name == _this.componentBindings[bind]) {
                                    prop = bind;
                                    break;
                                }
                            if (prop != null) {
                                _this.component[prop][e.detail.index].remove();
                            }
                        }
                    });
                }
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
                mutations.forEach(function (mutation) {
                    if (mutation.target instanceof HTMLElement) {
                        for (var compBind in _this.componentBindings) {
                            var auxCompBind = compBind;
                            if (compBind.indexOf('.') != -1)
                                auxCompBind = auxCompBind.split('.')[0];
                            if (auxCompBind === mutation.attributeName) {
                                var internalComponent = mutation.target;
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
                                _this.pendingSync[compBind] = internalComponent[auxCompBind];
                                break;
                            }
                        }
                    }
                });
                _this.syncDependencies(instance);
            });
            var config = { attributes: true, childList: false, characterData: true };
            observer.observe(this._component, config);
            this._component.onchange = function () {
                if (typeof (instance.component["value"]) != undefined)
                    _this.pendingSync["value"] = instance.component["value"];
                _this.syncDependencies(instance);
            };
            this._component.onkeyup = function () {
                if (typeof (instance.component["value"]) != undefined)
                    _this.pendingSync["value"] = instance.component["value"];
                _this.syncDependencies(instance);
            };
        },
        enumerable: true,
        configurable: true
    });
    ModelProperty.prototype.syncDependencies = function (instance) {
        instance.component.dispatchEvent(instance.componentSync);
        instance.pendingSync = {};
    };
    ModelProperty.prototype.onBindingChange = function (args) {
        args.preventDefault();
        var prop = "";
        var internalComponent = this.component;
        for (var bind in this.componentBindings)
            if (args.detail.name == this.componentBindings[bind]) {
                prop = bind;
                break;
            }
        if (prop.indexOf('.') != -1) {
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
            if (internalComponent[prop].__proto__ == HTMLCollection.prototype) {
                if (this.bindings[args.detail.name].dirty) {
                    for (var j = internalComponent[prop].length - 1; j > -1; j--)
                        internalComponent[prop][j].remove();
                    if (Array.isArray(args.detail.value) || args.detail.value instanceof ObservableArray) {
                        for (var i = 0; i < args.detail.value.length; i++)
                            this.bindingObservableItem(args.detail.name, i, args.detail.value[i]);
                    }
                    else {
                        this.bindingObservableItem(args.detail.name, 0, args.detail.value);
                    }
                }
            }
            else
                internalComponent[prop] = args.detail.value;
        }
        if (!this.modelView.isInitialization)
            for (var bindingName in this.bindings) {
                if (bindingName.indexOf('#') == 0 && bindingName.indexOf(args.detail.name) != -1
                    && bindingName !== args.detail.name)
                    this.bindings[bindingName].dispatchChangeEvent();
            }
    };
    ModelProperty.prototype.bindingObservableItem = function (propName, index, item) {
        if (!this.bindings[propName] || this._template == undefined)
            return;
        var element = this._template.cloneNode(true);
        this.component.appendChild(element);
        var newModel = new ModelView(propName + "_" + index, item, element, propName);
        //var newMdProp = new ModelProperty(newModel, <HTMLElement>element);
        //newModel.properties.push(newMdProp);
        this.modelView.subModels.push(newModel);
        //for (var bindName in newMdProp.bindings)
        //	newMdProp.bindings[bindName].dispatchChangeEvent();
    };
    ModelProperty.prototype.createPropertyBinding = function () {
        for (var propKey in this.componentBindings) {
            var propertyName = this.componentBindings[propKey];
            var result = null;
            if (this.bindings && this.bindings[propertyName]) {
                result = this.bindings[propertyName];
            }
            else {
                var source = this.modelView.model;
                var parentPropName = "";
                var propName = propertyName;
                if (propertyName.indexOf('#') != 0 && propertyName.indexOf('.') != -1) {
                    var internalProps = propertyName.split('.');
                    parentPropName = internalProps[internalProps.length - 2];
                    propName = internalProps[internalProps.length - 1];
                    internalProps = internalProps.slice(0, internalProps.length - 1);
                    internalProps.forEach(function (n) {
                        if (!source[n])
                            source[n] = {};
                        source = source[n];
                    });
                }
                result = new BindableProperty(propertyName, this.modelView.modelName + "_" + parentPropName + "_" + propertyName, source[propName], source);
                ModelProperty.createAccesorProperty(propName, source, result);
                if (!this.bindings)
                    this.bindings = {};
                this.bindings[propertyName] = result;
            }
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
        Object.defineProperty(source, "$" + propertyName, {
            get: function () {
                return this[privateProp].objectValue;
            },
            enumerable: true,
            configurable: true
        });
        if (!source['mutated-accesors'])
            source['mutated-accesors'] = [];
        source['mutated-accesors'].push(propertyName);
    };
    return ModelProperty;
})();
