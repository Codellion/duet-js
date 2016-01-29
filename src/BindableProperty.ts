/// <reference path="ObservableArray.ts" />
/// <reference path="ModelProperty.ts" />
/// <reference path="DynamicCode.ts" />

class BindableProperty {
	name: string;
	template: HTMLElement;
	dirty: boolean = false;
	isFunction: boolean;
	model: any;
	htmlComponent: HTMLElement;
	references: Array<string>;
	ignore: boolean;
	selectValueProp: string;

	private _internalExpression: string;
	private _tempValue: any;
	private _value: any;
	private _parentValue: any;
	private _parseInProgress: boolean;
	private _eventExpresion: string;
	private _funcExpresion: string = null;
	private _externalReference: string;
	private _funcIsChecked: boolean = false;
	private _funcDefinition: any;
	private _funcDefinitionString: string;
	private _objectValue: any;

	propertyChange: CustomEvent;

	get funcDefinition(): string {
		if (this._funcDefinitionString == null)
			this._funcDefinitionString = this._funcDefinition.toString().replace(' ', '');

		return this._funcDefinitionString;
	}

	get internalExpression(): string {
		return this._internalExpression;
	}

	get dispatchEvents(): Array<string> {
		if (!window["dt-dispatchEvents"])
			window["dt-dispatchEvents"] = [];

		return <Array<string>>window["dt-dispatchEvents"];
	}

	get value(): any {
		var propName = this.name;

		if ((this._internalExpression.indexOf('#') == 0 || this._internalExpression.indexOf('@') == 0) && this.dirty == true) {
			var result: any = null;
			var func = this._funcExpresion;
			if (func == null) {
				func = this._internalExpression.slice(1);

				if (func.indexOf("=>") != -1)
					func = DynamicCode.parseLambdaExpression(func);
			}

			if (this._internalExpression.indexOf('@') == 0) {
				this._eventExpresion = func;
				var self = this;
				result = (function() {
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

				this._value = (function() {
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
					var selectComp = <HTMLSelectElement>this.htmlComponent;

					if (!selectComp.multiple)
						this._objectValue = this._parentValue[childProp].find(n => n[filterProp] === selectComp.value);
					else {
						var lenght = selectComp.children.length;
						var arrValue = [];

						for (var i = 0; i < lenght; i++) {
							if (selectComp.children[i]['selected']) {
								arrValue.push(this._parentValue[childProp].find(n => n[filterProp] === selectComp.children[i]['value']));
							}
						}

						this._objectValue = arrValue;
					}
				}

				this.dirty = false;
			}
		}

		return this._value;
	}

	get objectValue(): any {
		return this._objectValue;
	}

	get stringValue(): string {
		var result: string = "";

		if (this.objectValue != null || typeof this.objectValue == "object")
			result = JSON.stringify(this.originalObject(this.objectValue));
		else
			result = this.value.toString();

		return result;
	}

	set value(value: any) {
		this._value = value;
		if (!this.ignore) {
			this.propertyChange = new CustomEvent(this.propertyChangeEvent, { detail: this });
			document.dispatchEvent(this.propertyChange);
		}
	}

	set internalValue(value: any) {
		this._value = value;
	}

	get propertyChangeEvent(): string {
		return "propertyChange" + this.name;
	}

	constructor(propertyName: string, internalExpression: string, value: any, parentValue: any, model: any, element: HTMLElement, isIndependent?: boolean) {
		this.name = propertyName;
		this._internalExpression = internalExpression;
		this._tempValue = null;
		this._parentValue = parentValue;
		this._externalReference = null;
		this.propertyChange = new CustomEvent(this.propertyChangeEvent, { detail: this });
		this.model = model;
		this.htmlComponent = element;
		this.references = new Array<string>();
		this.ignore = false;
		this._funcDefinitionString = null;

		if (Array.isArray(value) || value instanceof ObservableArray) {
			if (Array.isArray(value)) {
				var obsArr: ObservableArray<any> = null;
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

	dispatchChangeEvent(argName?: string) {
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
	}

	private originalObject(value: any): any {
		var ori: any = null;

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
	}
}

