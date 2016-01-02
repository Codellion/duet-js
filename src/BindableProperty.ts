/// <reference path="ObservableArray.ts" />
/// <reference path="ModelProperty.ts" />
/// <reference path="DynamicCode.ts" />

class BindableProperty {
	name: string;
	template: HTMLElement;
	dirty: boolean = false;

	private _hashEventName: string;
	private _tempValue: any;
	private _value: any;
	private _parentValue: any;
	private _parseInProgress: boolean;
	private _eventExpresion: string;
	private _externalReference: string;
	private _functions: DOMStringMap;

	propertyChange: CustomEvent;

	get dispatchEvents(): Array<string> {
		if (!window["dt-dispatchEvents"])
			window["dt-dispatchEvents"] = [];

		return <Array<string>>window["dt-dispatchEvents"];
	}

	get value(): any {
		if (this._parseInProgress)
			return null;

		if((this.name.indexOf('#') == 0 || this.name.indexOf('@') == 0) && this.dirty == true) {
			var func = this.name.slice(1);
			var result: any = null;

			if (func.indexOf("=>") != -1)
				func = DynamicCode.parseLambdaExpression(func);

			if (this.name.indexOf('@') == 0){
				this._eventExpresion = func;		
				var _this = this;
				result = (function() { 
					window["dt-dispatchEvents"] = [];
					return DynamicCode.evalInContext(_this._eventExpresion, _this._parentValue); 
				});				
			}
			else {
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

			return result;
		}
		else {
    		return this._value;
		}
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
						new BindableProperty(mutatedProp, oldProp["_hashEventName"], oldProp["_value"], obj));
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

    get hashEventName(): string {
		return this._hashEventName;
	}

	set hashEventName(value: string) {
		this._hashEventName = value;
	}

	get propertyChangeEvent(): string {
		return "propertyChange" + this.hashEventName;
	}
	
	constructor(propertyName: string, hashEventName: string, value: any, parentValue: any, isIndependent?: boolean) {
		this.name = propertyName;
		this._tempValue = null;
		this._parentValue = parentValue;
		this._externalReference = null;
		this.hashEventName = hashEventName;
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