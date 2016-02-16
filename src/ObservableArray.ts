/// <reference path="ObservableItem.ts" />
/// <reference path="BindableProperty.ts" />

class ObservableArray<T> extends Array<T> {
	private _name: string;
	private _binding: BindableProperty;

	get name(): string {
		return this._name;
	}

	get propertyChangeEvent(): string {
		return "propertyChange" + this.name;
	}

	elementAdded: CustomEvent;
	elementRemoved: CustomEvent;
	propertyChange: CustomEvent;

	constructor(name: string, binding?: BindableProperty) {
		var _self = this;
		super();
		this._name = name;
		if (binding)
			this._binding = binding;
		else
			this._binding = null;
	}

	initialize(items: Array<T>): void {
		items.forEach((n) => super.push(n));
	}

	push(...items: T[]): number {
		var res: number = 0;
		items.forEach((n) => {
			n["_parentReference"] = this;
			res = super.push(n);
			if (this._binding === null) {
				this.elementAdded = new CustomEvent(this.name + "elementAdded", { detail: new ObservableItem(this.name, n, res) });
				document.dispatchEvent(this.elementAdded);
			}
			else
				this._binding.dispatchChangeEvent(null);
		});
		return res;
	}

	pop(): T {
		var index = this.length - 1;
		var res = super.pop();
		if (this._binding === null) {
			this.elementRemoved = new CustomEvent(this.name + "elementRemoved", { detail: new ObservableItem(this.name, res, index) });
			document.dispatchEvent(this.elementRemoved);
		}
		else
			this._binding.dispatchChangeEvent(null);

		return res;
	}

	unshift(...items: T[]): number {
		var res: number = 0;
		items.forEach((n) => {
			n["_parentReference"] = this;
			res = super.unshift(n);
			if (this._binding === null) {
				this.elementAdded = new CustomEvent(this.name + "elementAdded", { detail: new ObservableItem(this.name, n, res) });
				document.dispatchEvent(this.elementAdded);
			}
			else
				this._binding.dispatchChangeEvent(null);
		});
		return res;
	}

	shift(): T {
		var res = super.shift();
		if (this._binding === null) {
			this.elementRemoved = new CustomEvent(this.name + "elementRemoved", { detail: new ObservableItem(this.name, res, 0) });
			document.dispatchEvent(this.elementRemoved);
		}
		else
			this._binding.dispatchChangeEvent(null);

		return res;
	}

    splice(start: number, deleteCount?: number, ...items: T[]): T[] {
        var res = Array.prototype.splice.call(this, [start, deleteCount, items]);
        
        res.forEach((n) => {
            if (this._binding === null) {
                this.elementRemoved = new CustomEvent(this.name + "elementRemoved", { detail: new ObservableItem(this.name, n, 0) });
                document.dispatchEvent(this.elementRemoved);
            }
            else
                this._binding.dispatchChangeEvent(null);
        });              
       
        return res;
    }

	change(index: number, value: T): void {
		var origin = this[index];

		for (var prop in origin) {
			if (value[prop])
				origin[prop] = value[prop];
		}
	}
}
