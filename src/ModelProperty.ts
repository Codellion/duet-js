/// <reference path="ModelView.ts" />
/// <reference path="BindableProperty.ts" />

class ModelProperty<T> {
	private _component: HTMLElement;
	private _modelView: ModelView<T>;
	private _template: HTMLElement;
	
	internalBindings: IDictionary<BindableProperty>;
	componentBindings: DOMStringMap;
	pendingSync: {};

	componentSync: CustomEvent;


	get dispatchEvents(): Array<string> {
		if (!window["dt-dispatchEvents"])
			window["dt-dispatchEvents"] = [];

		return <Array<string>>window["dt-dispatchEvents"];
	}

	set dispatchEvents(value: Array<string>) {
		window["dt-dispatchEvents"] = value;
	}

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
	
		this._component.addEventListener("change", () => { ModelProperty.syncComponentEvent(instance); }, false);
		this._component.addEventListener("keydown", () => { ModelProperty.syncComponentEvent(instance); }), false;
		this._component.addEventListener("keyup", () => { ModelProperty.syncComponentEvent(instance); }, false);
    }

	constructor(modelView: ModelView<T>, component: HTMLElement) {		
		this.modelView = modelView;
		this.component = component;
		this.componentBindings = {};
		this.pendingSync = {};
		this.internalBindings = {};

		var binding = false;

		for (var name in this.component.dataset) {
			if (this.component.dataset.hasOwnProperty(name) && (<string>name).indexOf("dt") == 0) {
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
				this._template = <HTMLElement>node;
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

			this.component.addEventListener("componentSync", (e: CustomEvent) => {

				if (e instanceof CustomEvent && e.detail instanceof ModelProperty) {
					var mdProp = <ModelProperty<T>>e.detail;
					var comp = mdProp.component;

					var internalComponent = this.component;

					

					for (var pendChange in mdProp.pendingSync) {						
						var binding = this.bindings[this.componentBindings[pendChange]];
						var propName = pendChange;						

						if (propName.indexOf('.') != -1) {
							var internalProps = propName.split('.');
							propName = internalProps[internalProps.length - 1];
							internalProps = internalProps.slice(0, internalProps.length - 1);

							internalProps.forEach((n) => {
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

						/*
						

						if (binding != undefined && internalComponent[pendChange] != undefined
						 && binding.value != internalComponent[pendChange]) {
							binding.value = internalComponent[pendChange];
						}*/
					}
				}
			}, false);
		}

		this.componentSync = new CustomEvent("componentSync", { detail: this });
	}

	private listenChangeEvents(propName: string, bindProperty: BindableProperty): void {
		document.addEventListener(bindProperty.propertyChangeEvent,
			(e: CustomEvent) => this.onBindingChange(<CustomEvent>e), false);


		var internalComponent = this.component;
		var propInternalName = propName;

		if (propInternalName.indexOf('.') != -1) {
			var internalProps = propInternalName.split('.');
			propInternalName = internalProps[internalProps.length - 1];
			internalProps = internalProps.slice(0, internalProps.length - 1);

			internalProps.forEach((n) => {
				if (!internalComponent[n])
					internalComponent[n] = {};

				internalComponent = internalComponent[n];
			});
		}

		this.bindings[propName].htmlComponent = internalComponent;

		if (this.bindings[propName].value instanceof ObservableArray) {
			document.addEventListener(propName + "elementAdded", (e: CustomEvent) => {
				if (e.detail instanceof ObservableItem) {
					var prop = this.getComponentBinding(e.detail.name);

					this.bindingObservableItem(e.detail.name, e.detail.index, e.detail.item, prop);
				}
			});

			document.addEventListener(propName + "elementRemoved", (e: CustomEvent) => {
				if (e.detail instanceof ObservableItem) {
					var prop = this.getComponentBinding(e.detail.name);

					if (prop != null) {
						if (this.component[prop][e.detail.index].remove)
							this.component[prop][e.detail.index].remove();
						else
							this.component.removeChild(this.component.children[e.detail.index]);
					}
				}
			});
		}
	}

	private syncDependencies(instance: ModelProperty<T>): void {
		if(!this.modelView.isInitialization)
			instance.component.dispatchEvent(instance.componentSync);
		instance.pendingSync = {};
	}

	private onBindingChange(args: CustomEvent): void {
		args.preventDefault();

		this.setComponentBinding(args.detail);		

		if (!this.modelView.isInitialization){			
			this.modelView.checkBindDependencies(args);
		}
	}

	private bindingObservableItem(propName: string, index: number, item: any, bindName: string) {
		if (!this.bindings[propName] || this._template == undefined)
			return

		var newModelName = this.modelView.modelName + "|" + propName + "|" + index;

		if (this.modelView.subModels.some(n => n.modelName === newModelName)) {
			var subIndex = null;
			var i = -1;
			this.modelView.subModels.forEach(n => {
				i++
				if (n.modelName == newModelName) {
					subIndex = i;
				}
			});

			if (subIndex > -1) {
				this.modelView.subModels[subIndex].bindings = {};
				this.modelView.subModels.splice(subIndex, 1);
			}
		}

		if(this._component instanceof HTMLSelectElement && this._template.dataset 
			&& (this._template.dataset['dtValue'] || this._template.dataset['dtText'])){
			if (this._template.dataset['dtValue'])
				this.bindings[propName].selectValueProp = this._template.dataset['dtValue'];
			else
				this.bindings[propName].selectValueProp = this._template.dataset['dtText'];
				
		}

		var element = this._template.cloneNode(true);
		this.component.appendChild(element);

		var newModel = new ModelView(newModelName, item, <HTMLElement>element, bindName, this.modelView.originalModel);
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
				this.internalBindings[propertyName] = result;
			}
			else {
				var source = this.modelView.model;
				var parentPropName = "";
				var propName = propertyName;

				if (propName.indexOf('|') !== -1) {
					propName = propName.replace(this.modelView.modelName + '|', '');
					if(propName.indexOf('#') === -1)
						propName = propName.replace('|', '.');
				}

				if (propName.indexOf('#') != 0 && propName.indexOf('@') != 0 && propName.indexOf('.') != -1) {
					var internalProps = propName.split('.');
					parentPropName = internalProps[internalProps.length - 2];
					propName = internalProps[internalProps.length - 1];
					internalProps = internalProps.slice(0, internalProps.length - 1);

					internalProps.forEach((n) => {
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
	}

	setComponentBinding(binding: BindableProperty): void {
		binding.dirty = true;
		var internalComponent = this.component;
		var prop = this.getComponentBinding(binding.name);

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
			else if (typeof (binding.value) !== "undefined"){
				if(internalComponent['multiple']) {
					var lenght = internalComponent.children.length;

					for (var i = 0; i < lenght; i++) {
						if (binding.value != null && binding.value.indexOf(internalComponent.children[i]['value']) !== -1) {
							internalComponent.children[i]['selected'] = true;
						}
					}
				}
				else {
					internalComponent[prop] = binding.value;
				}
			}
		}
	}

	static createAccesorProperty(propertyName: string, source: Object, property: BindableProperty): void {
		if (Array.isArray(source) || source instanceof ObservableArray)
			return;

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

		Object.defineProperty(source, propertyName + "_stringify", {
			get: function() {
				return this[privateProp].stringValue;
			},
			enumerable: true,
			configurable: true
		});

		if (!source['mutated-accesors'])
			source['mutated-accesors'] = [];

		source['mutated-accesors'].push(propertyName);
	}

	static syncComponentEvent(instance: ModelProperty<any>): void {
		instance.dispatchEvents = [];
		for (var compBind in instance.componentBindings) {
			if (typeof (instance.component[compBind]) != undefined
			 && instance.component[compBind].__proto__ !== HTMLCollection.prototype){
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
	}
}