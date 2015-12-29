/// <reference path="ModelView.ts" />
/// <reference path="BindableProperty.ts" />

class ModelProperty<T> {
	private _component: HTMLElement;
	private _modelView: ModelView<T>;
	private _template: HTMLElement;
	
	componentBindings: DOMStringMap;
	pendingSync: DOMStringMap;

	componentSync: CustomEvent;

	get bindings(): IDictionary<BindableProperty> {
		return this._modelView.bindings;
	}

    get modelView(): ModelView<T> {
        return this._modelView;
    }

    set modelView(value: ModelView<T>) {
        this._modelView = value;
    }

    get component(): HTMLElement {
        return this._component;
    }

    set component(value: HTMLElement) {
		var instance: ModelProperty<T> = this;
        this._component = value;

		var observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => this.syncComponentChange(mutation.target, mutation.attributeName));
			this.syncDependencies(instance);
		});

		var config = { attributes: true, childList: false, characterData: true };
		observer.observe(this._component, config);
	
        this._component.onchange = () => {
			if (typeof (instance.component["value"]) != undefined)
				this.pendingSync["value"] = instance.component["value"];
			this.syncDependencies(instance);
        };

        this._component.onkeyup = () => {
			if (typeof (instance.component["value"]) != undefined)
				this.pendingSync["value"] = instance.component["value"];
			this.syncDependencies(instance);
        };
    }

	constructor(modelView: ModelView<T>, component: HTMLElement) {		
		this.modelView = modelView;
		this.component = component;
		this.componentBindings = {};
		this.pendingSync = {};

		var binding = false;

		for (var name in this.component.dataset) {
			if (this.component.dataset.hasOwnProperty(name) && (<string>name).indexOf("dt") == 0) {
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
				this._template = <HTMLElement>node;
				this.component.removeChild(node);
			}
		}	
				

		if (binding) {
			this.createPropertyBinding();

			for (var bindableProp in this.componentBindings) {
				var propName = this.componentBindings[bindableProp];
				var bindProperty = this.bindings[propName];

				document.addEventListener(bindProperty.propertyChangeEvent, 
					(e: CustomEvent) => this.onBindingChange(<CustomEvent>e), false);

				if (this.bindings[propName].objectValue instanceof ObservableArray) {
					document.addEventListener(propName + "elementAdded",(e: CustomEvent) => {
						if(e.detail instanceof ObservableItem) {
							var prop = this.getComponentBinding(e.detail.name);

							this.bindingObservableItem(e.detail.name, e.detail.index, e.detail.item, prop);
						}						
					});

					document.addEventListener(propName + "elementRemoved", (e: CustomEvent) => {
						if (e.detail instanceof ObservableItem) {
							var prop = this.getComponentBinding(e.detail.name);

							if(prop != null) {
								if (this.component[prop][e.detail.index].remove)
									this.component[prop][e.detail.index].remove();
								else
									this.component.removeChild(this.component.children[e.detail.index]);
							}
						}
					});
				}
			}

			this.component.addEventListener("componentSync", (e: CustomEvent) => {

				if (e instanceof CustomEvent && e.detail instanceof ModelProperty) {
					var mdProp = <ModelProperty<T>>e.detail;
					var comp = mdProp.component;

					for (var pendChange in mdProp.pendingSync) {
						var binding = this.bindings[this.componentBindings[pendChange]];

						var internalComponent = this.component;

						if (pendChange.indexOf('.') != -1) {
							var internalProps = pendChange.split('.');
							pendChange = internalProps[internalProps.length - 1];
							internalProps = internalProps.slice(0, internalProps.length - 1);

							internalProps.forEach((n) => {
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

	private syncDependencies(instance: ModelProperty<T>): void {
		if(!this.modelView.isInitialization)
			instance.component.dispatchEvent(instance.componentSync);
		instance.pendingSync = {};
	}

	private onBindingChange(args: CustomEvent): void {
		args.preventDefault();

		var internalComponent = this.component;
		var prop = this.getComponentBinding(args.detail.name);

		if (prop != null && prop.indexOf('.') != -1) {
			var internalProps = prop.split('.');
			prop = internalProps[internalProps.length - 1];
			internalProps = internalProps.slice(0, internalProps.length - 1);

			internalProps.forEach((n) => {
				if (!internalComponent[n])
					internalComponent[n] = {};

				internalComponent = internalComponent[n];
			});
		}

		if (typeof (internalComponent[prop]) != undefined) {
			if (internalComponent[prop].__proto__ == HTMLCollection.prototype) {
				if (this.bindings[args.detail.name].dirty) {
					for (var j = internalComponent[prop].length - 1; j > -1; j--)
						if(internalComponent[prop][j].remove)
							internalComponent[prop][j].remove();
						else
							this.component.removeChild(this.component.children[j]);

					if (Array.isArray(args.detail.objectValue) || args.detail.objectValue instanceof ObservableArray) {
						for (var i = 0; i < args.detail.objectValue.length; i++)
							this.bindingObservableItem(args.detail.name, i, args.detail.objectValue[i], prop);
					}
					else {
						this.bindingObservableItem(args.detail.name, 0, args.detail.objectValue, prop);
					}					
				}				
			}
			else
				internalComponent[prop] = args.detail.value;
		}

		if(!this.modelView.isInitialization)
			for (var bindingName in this.bindings) {
				if (bindingName.indexOf('#') == 0 && bindingName.indexOf(args.detail.name) != -1
					&& bindingName !== args.detail.name)
					this.bindings[bindingName].dispatchChangeEvent();
			}
	}

	private bindingObservableItem(propName: string, index: number, item: any, bindName: string) {
		if (!this.bindings[propName] || this._template == undefined)
			return;

		var element = this._template.cloneNode(true);
		this.component.appendChild(element);

		var newModel = new ModelView(propName + "_" + index, item, <HTMLElement>element, bindName);
		this.modelView.subModels.push(newModel);
	}

	private getComponentBinding(bindName: string): string {
		var prop: string = "";
		for (var bind in this.componentBindings)
			if (bindName == this.componentBindings[bind]) {
				prop = bind;
				break;
			}

		return prop;
	}	

	private syncComponentChange(comp: any, attrName: string): void {
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

						internalProps.forEach((n) => {
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
	}

	createPropertyBinding(): void {
		for (var propKey in this.componentBindings) {
			var propertyName = this.componentBindings[propKey];
			var result: BindableProperty = null;

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

					internalProps.forEach((n) => {
						if (!source[n])
							source[n] = {};

						source = source[n];
					});
				}

				result = new BindableProperty(propertyName, 
					this.modelView.modelName + "_" + parentPropName + "_" + propertyName, 
					source[propName], source);

				ModelProperty.createAccesorProperty(propName, source, result);

				if (!this.bindings)
					this.bindings = {};

				this.bindings[propertyName] = result;
			}
		}
	}

	static createAccesorProperty(propertyName: string, source: Object, property: BindableProperty): void {
		if (source['mutated-accesors'] && source['mutated-accesors'].indexOf(propertyName) != -1)
			return;

		var privateProp = "_" + propertyName;
		source[privateProp] = property;

		Object.defineProperty(source, propertyName, {
			get: function() {
				return this[privateProp].value;
			},
			set: function(value) {
				this[privateProp].value = value;
			},
			enumerable: true,
			configurable: true
		});

		Object.defineProperty(source, "$" + propertyName, {
			get: function() {
				return this[privateProp].objectValue;
			},
			enumerable: true,
			configurable: true
		});

		if (!source['mutated-accesors'])
			source['mutated-accesors'] = [];

		source['mutated-accesors'].push(propertyName);
	}
}