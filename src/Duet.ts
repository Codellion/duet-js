/// <reference path="ModelView.ts" />

class duet<T> {
	static bind(modelName: string, model: any): any {
		return new ModelView(modelName, model);
	}
}