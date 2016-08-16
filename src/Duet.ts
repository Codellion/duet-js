/// <reference path="ModelView.ts" />

class duet<T> {
	static bind(model: any): any {
		return new ModelView("virtualModel", model);
	}
}