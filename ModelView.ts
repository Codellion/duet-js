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
	properties: Array<ModelProperty<T>>;
	model: any;
	bindings: IDictionary<BindableProperty>;
	subModels: Array<ModelView<any>>;
	isInitialization: boolean;

	private _modelName: string;

    get modelName(): string {
        return this._modelName;
    }

    set modelName(value: string) {
        this._modelName = value;
    }

	constructor(modelName: string, model: { new (): T; }, elementContainer?: Element, elementModel?: string) {
		this.modelName = modelName;
		this.properties = new Array<ModelProperty<T>>();
		this.bindings = {};
		this.subModels = new Array<ModelView<any>>();
		this.isInitialization = true;

		if(model) {
			this.model = model;
		}

		if(modelName) {
			var docElements: NodeListOf<Element> = null;

			if (elementContainer) {
				docElements = elementContainer.querySelectorAll("[data-dt='" + elementModel + "']");
				var mdContainer = new ModelProperty(this, <HTMLElement>elementContainer);
				for (var bindName in mdContainer.bindings)
					mdContainer.bindings[bindName].dispatchChangeEvent();

				this.properties.push(mdContainer);
			}
			else
				docElements = document.querySelectorAll("[data-dt='" + modelName + "']");

			if (docElements.length > 0) {
				var docElementsArr: Array<Element> = Array.prototype.slice.call(docElements, 0);
				docElementsArr.forEach((element, index) => {
					if (element instanceof HTMLElement){
						var newProperty = new ModelProperty(this, <HTMLElement>element);
						this.properties.push(newProperty);
					}
				});

				for (var bindName in this.bindings)
						this.bindings[bindName].dispatchChangeEvent();
			}
		}

		this.isInitialization = false;
	}	
}