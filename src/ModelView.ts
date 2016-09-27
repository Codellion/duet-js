/// <reference path="ModelProperty.ts" />
/// <reference path="BindableProperty.ts" />
/// <reference path="IDictionary.ts" />

//IE Fix
(function() {
	function CustomEvent(event, params) {
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		var evt = document.createEvent('CustomEvent');
		evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
		return evt;
	}

	CustomEvent.prototype = Event.prototype;
	window["CustomEvent"] = CustomEvent;
})();

class ModelView<T> {
	originalModel: any;
	properties: Array<ModelProperty<T>>;
	model: any;
	subModels: Array<ModelView<any>>;
	isInitialization: boolean;
	rosettaComps: Array<any>;
	parentModel: ModelView<any>;


	private _modelName: string;
	private _isUnbind: boolean;

	get bindings(): IDictionary<BindableProperty> {
		return <IDictionary<BindableProperty>>window[this.modelName + "_dt-bindings"];
	}

	set bindings(value: IDictionary<BindableProperty>) {
		window[this.modelName + "_dt-bindings"] = value;
	}

	get modelName(): string {
		return this._modelName;
	}

	set modelName(value: string) {
		this._modelName = value;
	}

	constructor(modelName: string, model: { new (): T; }, elementContainer?: Element, elementModel?: string, oriModel?: ModelView<any>, parentModel?: ModelView<any>) {
		this.modelName = modelName;
		this.properties = new Array<ModelProperty<T>>();
		if (!this.bindings)
			this.bindings = {};
		this.subModels = new Array<ModelView<any>>();
		this.isInitialization = true;
		this.rosettaComps = [];

		if (oriModel)
			this.originalModel = oriModel;
		else
			this.originalModel = this;

		if(parentModel)
			this.parentModel = parentModel;

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
			var docElements: Array<Element> = [];

			if (elementContainer) {
				docElements = this.getAllDuetNodes(elementContainer);
				
				var mdContainer = new ModelProperty(this, <HTMLElement>elementContainer);
				this.properties.push(mdContainer);
			}
			else
				docElements = this.getAllDuetNodes();

			if (docElements.length > 0) {
				docElements.forEach((element, index) => {
					var newProperty = new ModelProperty(this, <HTMLElement>element);
					this.properties.push(newProperty);
				});
			}

			this.refreshUI();
		}

		for(var rComp = 0; rComp < this.rosettaComps.length; rComp++) {
			var rosettaComp = this.rosettaComps[rComp];

			rosettaComp.lazyInit = true;
			rosettaComp.init(this);
		}

		this.rosettaComps = [];

		this.isInitialization = false;
	}

	refreshUI() : void {
		this.properties.forEach(n => {
			for (var bindName in n.internalBindings)
				n.setComponentBinding(n.bindings[bindName]);			
		});
	}

	unbind(): void {
		this.bindings = {};
		this.properties.forEach(n => n.isUnbind = true);
		this._isUnbind = true;

		this.subModels.forEach(subMd => subMd.unbind());
	}

	getAllDuetNodes(element?: any) : Array<HTMLScriptElement> {
		
		var isAutoGen : boolean = false;

		if(!element) {
			element = document;
		}
		else {
			isAutoGen = element.dataset.dtBindingGeneration !== undefined;
		}

		var dom =  element.getElementsByTagName('*');
		var res = [];
		var resParent = [];

		for(var i=0; i<dom.length; i++){
			var domObj = dom[i];
			var domFound = false;

			if(domObj.attributes.hasOwnProperty("dt") || domObj.attributes.hasOwnProperty("data-dt")){
				if(domObj.attributes.hasOwnProperty("dt")) {
					validNode = (domObj.attributes["dt"].value == this.originalModel.modelName) || isAutoGen;
				}
				else if(domObj.attributes.hasOwnProperty("data-dt")) {
					validNode = (domObj.attributes["data-dt"].value == this.originalModel.modelName) || isAutoGen;
				}
			}
			else
				validNode = ("duet.model" == this.originalModel.modelName) || isAutoGen;

			if(validNode){
				for(var j=0; j<domObj.attributes.length && !domFound; j++){
					var attr = domObj.attributes[j];
					var attrName = attr.name;
					var validNode = true;

					if(attr.name.indexOf('data-') == 0){
						attrName = attr.name.slice(5);
					}

					if(attrName.indexOf('dt') == 0 || attrName.indexOf('dt') == 0 && attrName != "dt-binding-generation") {
						var isSubElement = false;
						for(var k=0; k<resParent.length && !isSubElement; k++){
							isSubElement = resParent[k].contains(domObj);
						}

						if(!isSubElement){
							res.push(domObj);

							if(domObj.hasAttribute('dt-children') || domObj.hasAttribute('data-dt-children'))
								resParent.push(domObj);
						}
						
						domFound = true;
					}
				}
			}
		}

		return res;
	}

	getSimpleModel() : any {
		return this.toSimpleModel(null, this.model);
	}

	getJSON() : string {
		return JSON.stringify(this.getSimpleModel());
	}

	private toSimpleModel(res?: any, obj?: any): void {

		if(!res) {
			if(typeof obj == "object") {
				if(obj instanceof Array || obj instanceof ObservableArray){
					res = [];
				}
				else {
					res = {};
				}
			}
			else {
				return obj;
			}
		}

		if(!obj)
			obj = this.model;
		
		var auxAccesor = obj["mutated-accesors"];

		if(auxAccesor) {
			for (var i in auxAccesor) {
				var propName = auxAccesor[i];

				if(propName.indexOf('@') != 0 && propName.indexOf('#') != 0) {
					var bind = obj["_" + propName];
					var bindValue = bind.value;

					if(bindValue) {
						if(typeof bindValue == "object") {
							var auxArr = [];

							if(bindValue instanceof Array || bindValue instanceof ObservableArray){
								for(var j = 0; j < bindValue.length; j++) {
									var auxSubValue = this.toSimpleModel(null, bindValue[j]);
									auxArr.push(auxSubValue);
								}

								res[propName] = auxArr;
							}
							else if(bindValue["mutated-accesors"]){
								res[propName] = {};
								this.toSimpleModel(res[propName], bindValue);
							}
						}
						else {
							res[propName] = bindValue;
						}
					}
					else {
						res[propName] = null;
					}
				}
			}
		}
		else
			res = obj;
		

		return res;
	}

	private createObservableObject(obj: any, parentName?: string): void {
		if (typeof (obj) !== "object" || (obj && obj["mutated-observation"]))
			return;

		var instance = this;
		var parentPropName = "";

		if (parentName)
			parentPropName = parentName;

		var oriProps = [];

		for (var objProp in obj)
			oriProps.push(objProp)

		for (var objProp in oriProps) {
			var propertyName = oriProps[objProp];
			if (propertyName.indexOf('_') != 0 && typeof (obj[propertyName]) !== "function"
				&& propertyName !== "mutated-accesors" && propertyName.indexOf('$') != 0) {

				var propertyBindName = parentPropName + "|" + propertyName;

				var result: BindableProperty = this.bindings[propertyBindName];

				if (typeof (result) === "undefined") {
					result = new BindableProperty(propertyBindName, propertyName,
						obj[propertyName], obj, this.originalModel.model, null, true);
				}

				ModelProperty.createAccesorProperty(propertyName, obj, result);

				this.createObservableObject(obj[propertyName], propertyBindName);
				this.bindings[propertyBindName] = result;

				document.addEventListener(result.propertyChangeEvent,
					function (args: CustomEvent) {
						if(instance._isUnbind) {
							document.removeEventListener(result.propertyChangeEvent, <any>arguments.callee, false);
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
	}

	checkBindDependencies(args: CustomEvent): void {
		var name = args.detail.internalExpression;

		if (args.detail["_externalReference"] && args.detail["_externalReference"] != null)
			name = args.detail["_externalReference"];

		for (var bindingName in this.bindings) {
			var binding = this.bindings[bindingName];

			if ((binding.internalExpression.indexOf('#') == 0 || binding.isFunction) && binding.internalExpression !== name) {
				var expr = binding.internalExpression;

				if (binding.isFunction)
					expr = binding.funcDefinition;

				if(binding.references.indexOf(name) !== -1)
					binding.dispatchChangeEvent();
				else {
					if (this.containsBindReference(expr, name)) {
						binding.dispatchChangeEvent();
						binding.references.push(name);
					} else if (this.containsBindReference(expr, '$' + name)) {
						binding.dispatchChangeEvent();
						binding.references.push(name);
					} else if (this.containsBindReference(expr, name + '_stringify')) {
						binding.dispatchChangeEvent();
						binding.references.push(name);
					}
				}
			}
		}
	}

	static isAlphanumeric(str: string, i: number): boolean {
		var code = str.charCodeAt(i);
		if (!(code > 47 && code < 58) && // numeric (0-9)
			!(code > 64 && code < 91) && // upper alpha (A-Z)
			!(code > 96 && code < 123)) { // lower alpha (a-z)
			return false;
		}
		return true;
	}

	private containsBindReference(bindingName: string, reference: string): boolean {
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
	}
}
