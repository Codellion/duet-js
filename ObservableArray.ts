/// <reference path="ObservableItem.ts" />
class ObservableArray<T> extends Array<T> {
	private _name: string;

	get name(): string {
		return this._name;
	}

	elementAdded: CustomEvent;
	elementRemoved: CustomEvent;

	constructor(name: string, ...items:T[]){
		var _self = this;
		super();
		this._name = name;
	}

	initialize(items: Array<T>): void {
		items.forEach((n) => super.push(n));
	}

	push(...items: T[]): number {
		var res: number = 0;
		items.forEach((n) => {
			res = super.push(n);
			this.elementAdded = new CustomEvent(this.name + "elementAdded", { detail: new ObservableItem(this.name, n, res) });
			document.dispatchEvent(this.elementAdded);
		});
		return res;
	}

	pop(): T{
		var index = this.length - 1;
		var res = super.pop();
		this.elementRemoved = new CustomEvent(this.name + "elementRemoved", { detail: new ObservableItem(this.name, res, index) });
		document.dispatchEvent(this.elementRemoved);
		return res;
	}

	unshift(...items: T[]): number {
		var res: number = 0;
		items.forEach((n) => {
			res = super.unshift(n);
			this.elementAdded = new CustomEvent(this.name + "elementAdded", { detail: new ObservableItem(this.name, n, res) });
			document.dispatchEvent(this.elementAdded);
		});
		return res;
	}

	shift(): T {
		var res = super.shift();
		this.elementRemoved = new CustomEvent(this.name + "elementRemoved", { detail: new ObservableItem(this.name, res, 0) });
		document.dispatchEvent(this.elementRemoved);
		return res;
	}

	change(index: number, value: T): void {
		var origin = this[index];

		for(var prop in origin) {
			if (value[prop])
				origin[prop] = value[prop];
		}
	}
}