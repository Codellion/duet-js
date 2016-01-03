/// <reference path="ObservableArray.ts" />
/// <reference path="ModelProperty.ts" />
/// <reference path="DynamicCode.ts" />

class BindableProperty {
	name: string;
	template: HTMLElement;
	dirty: boolean = false;
	isFunction: boolean;

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

	propertyChange: CustomEvent;

	get funcDefinition(): any {
		return this._funcDefinition;
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
		if (this._parseInProgress)
			return null;

		var propName = this.name;

		if ((this._internalExpression.indexOf('#') == 0 || this._internalExpression.indexOf('@') == 0) && this.dirty == true) {
			var result: any = null;
			var func = this._funcExpresion;
			if(func == null) {
				func = this._internalExpression.slice(1);

				if (func.indexOf("=>") != -1)
					func = DynamicCode.parseLambdaExpression(func);
			}

			if (this._internalExpression.indexOf('@') == 0) {
				this._eventExpresion = func;		
				var _this = this;
				result = (function() { 
					window["dt-dispatchEvents"] = [];
					return DynamicCode.evalInContext(_this._eventExpresion, _this._parentValue); 
				});				
			}
			else {
				this._funcExpresion = func;

				if(!this._funcIsChecked && func.indexOf('this.') == 0 && func.indexOf('(') != -1){
					var funcAux = func.replace('this.', '');
					funcAux = funcAux.slice(0, funcAux.indexOf('('));
					this.isFunction = this._parentValue[funcAux] ? typeof this._parentValue[funcAux] === "function" : false;

					if (this.isFunction)
						this._funcDefinition = this._parentValue[funcAux];

					this._funcIsChecked = true;
				}

				result = DynamicCode.evalInContext(func, this._parentValue);

				/*if (typeof result == "object") {
					this._parseInProgress = true;
					var cache = [];
					result = JSON.stringify(result, function(key, value) {
						if (typeof value === 'object' && value !== null) {
							if (cache.indexOf(value) !== -1) {
								return;
							}
							cache.push(value);
						}
						return value;
					});
					cache = null;
					this._parseInProgress = false;

					result = "#JSON#" + result;
				}*/
			}

			this._value = result;
			this.dirty = false;
		}

		if (!this._funcIsChecked && this._internalExpression.indexOf('#') == -1 
			&& this._internalExpression.indexOf('@') == -1){
				this.isFunction = typeof this._value === "function";

				if (this.isFunction)
					this._funcDefinition = this._value;

				this._funcIsChecked = true;
		}

		return this._value;
    }

    get objectValue(): any {
		if (this.value && typeof (this.value) == "string" && this.value.indexOf("#JSON#") == 0){
			var obj = JSON.parse(this.value.slice(6));

			if (obj.hasOwnProperty('mutated-accesors')) {
				var auxAccesors = obj['mutated-accesors'];
				obj['mutated-accesors'] = [];
				for (var i in auxAccesors) {
					var mutatedProp = auxAccesors[i];
					var oldProp = obj['_' + mutatedProp];
					ModelProperty.createAccesorProperty(mutatedProp, obj, 
						new BindableProperty(mutatedProp, oldProp["_internalExpression"], oldProp["_value"], obj));
				}
			}

			return obj;
		}
		else
			return this.value;
    }

    set value(value: any) {
        this._value = value;
		document.dispatchEvent(this.propertyChange);
    }

    set internalValue(value: any) {
		this._value = value;
    }

	get propertyChangeEvent(): string {
		return "propertyChange" + this.name;
	}
	
	constructor(propertyName: string, internalExpression: string, value: any, parentValue: any, isIndependent?: boolean) {
		this.name = propertyName;
		this._internalExpression = internalExpression;
		this._tempValue = null;
		this._parentValue = parentValue;
		this._externalReference = null;
		this.propertyChange = new CustomEvent(this.propertyChangeEvent, { detail: this });

		if(Array.isArray(value) || value instanceof ObservableArray) {
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
		if (this.dispatchEvents.indexOf(this.propertyChangeEvent) !== -1)
			return;

		if (argName)
			this._externalReference = argName;

		this.dirty = true;
		var elIndex = this.dispatchEvents.push(this.propertyChangeEvent);
		document.dispatchEvent(this.propertyChange);
	}
}