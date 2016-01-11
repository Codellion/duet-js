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
                    var bindValue = this.component.dataset[name].trim();
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
                    var internalComponent = _this.component;
                    for (var pendChange in mdProp.pendingSync) {
                        var binding = _this.bindings[_this.componentBindings[pendChange]];
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
            this._component.addEventListener("change", function () { ModelProperty.syncComponentEvent(instance); }, false);
            this._component.addEventListener("keydown", function () { ModelProperty.syncComponentEvent(instance); }), false;
            this._component.addEventListener("keyup", function () { ModelProperty.syncComponentEvent(instance); }, false);
        },
        enumerable: true,
        configurable: true
    });
    ModelProperty.prototype.listenChangeEvents = function (propName, bindProperty) {
        var _this = this;
        document.addEventListener(bindProperty.propertyChangeEvent, function (e) { return _this.onBindingChange(e); }, false);
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
        if (typeof (internalComponent[prop]) != undefined) {
            if (internalComponent[prop] != null && internalComponent[prop].__proto__ == HTMLCollection.prototype) {
                if (binding.dirty) {
                    for (var j = internalComponent[prop].length - 1; j > -1; j--) {
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
                if (internalComponent['multiple']) {
                    var lenght = internalComponent.children.length;
                    for (var i = 0; i < lenght; i++) {
                        if (binding.value.indexOf(internalComponent.children[i]['value']) !== -1) {
                            internalComponent.children[i]['selected'] = true;
                        }
                    }
                }
                else {
                    internalComponent[prop] = binding.value;
                }
            }
        }
    };
    ModelProperty.createAccesorProperty = function (propertyName, source, property) {
        if (Array.isArray(source) || source instanceof ObservableArray)
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
        instance.dispatchEvents = [];
        for (var compBind in instance.componentBindings) {
            if (typeof (instance.component[compBind]) != undefined
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
