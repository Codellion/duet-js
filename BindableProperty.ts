/// <reference path="ObservableArray.ts" />
/// <reference path="ModelProperty.ts" />

class BindableProperty {
	name: string;
	template: HTMLElement;
	dirty: boolean = false;

	private _hashEventName: string;
	private _tempValue: any;
	private _value: any;
	private _parentValue: any;
	private _parseInProgress: boolean;

	propertyChange: CustomEvent;

	get value(): any {
		if (this._parseInProgress)
			return null;

		if(this.name.indexOf('#') == 0) {
			var result = this.evalInContext(this.name.slice(1), this._parentValue);
			if (typeof result == "object") {
				this._parseInProgress = true;
				var cache = [];
				result = JSON.stringify(result, function(key, value) {
				    if (typeof value === 'object' && value !== null) {
				        if (cache.indexOf(value) !== -1) {
				            // Circular reference found, discard key
				            return;
				        }
				        // Store value in our collection
				        cache.push(value);
				    }
				    return value;
				});
				cache = null; 
				this._parseInProgress = false;

				result = "#JSON#" + result;
			}

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

        if (Array.isArray(this._value) || this._value instanceof ObservableArray)
			this.dirty = true;

		document.dispatchEvent(this.propertyChange);

		this.dirty = false;
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
	
	constructor(propertyName: string, hashEventName: string, value: any, parentValue: any) {
		this.name = propertyName;
		this._tempValue = null;
		this._parentValue = parentValue;
		this.hashEventName = hashEventName;
		this.propertyChange = new CustomEvent(this.propertyChangeEvent, { detail: this });

		if(Array.isArray(value) || value instanceof ObservableArray) {
			if (Array.isArray(value)) {
				var obsArr = new ObservableArray(propertyName);
				this._tempValue = value;
				this.value = obsArr;
			}
			else
				this.value = value;				
		}
		else {
			this.value = value;
		}
	}

	private evalInContext(js, context) {
		return function() { return eval(js); }.call(context);
	}

	dispatchChangeEvent() {
		if (this._tempValue != null && this.value instanceof ObservableArray) {
			(<ObservableArray<Object>>this.value).initialize(<Object[]>this._tempValue);
			this._tempValue = null;
		}
		document.dispatchEvent(this.propertyChange);
	}
}