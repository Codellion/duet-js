/// <reference path="ModelView.ts" />

class duet {

	public static model: any;
	public static modelView: ModelView<any>;
	public static subModels: IDictionary<any>;
	public static subModelViews: IDictionary<ModelView<any>>;

	private static readyBound: boolean;
	private static isReady: boolean;
	private static readyComplete: boolean;
	private static initCallback: Function;

	static bind(model: any, modelName?: string): void {
		if(!duet.subModels)
			duet.subModels = {};
		if(!duet.subModelViews)
			duet.subModelViews = {};

		if(!modelName)
			duet.model = model;
		else {
			duet.subModels[modelName] = model;
		}

		if(duet.readyComplete) {
			if(modelName){
				if(duet.subModelViews[modelName]){
					duet.subModelViews[modelName].unbind();
					duet.subModelViews[modelName] = undefined;
				}

				duet.subModelViews[modelName] = new ModelView(modelName, duet.subModels[modelName]);
			}
			else {
				if(duet.modelView)
					duet.modelView.unbind();
				duet.modelView = new ModelView("duet.model", duet.model);
			}
		}

	}

	static init(callback? : Function): void {
		if(callback)
			duet.initCallback = callback;

	    if (duet.readyBound) return;
	    duet.readyBound = true;

	    // Mozilla, Opera and webkit nightlies currently support this event
	    if ( window.document.addEventListener ) {
	        // Use the handy event callback
	        window.document.addEventListener( "DOMContentLoaded", function(){
	            window.document.removeEventListener( "DOMContentLoaded", <any>arguments.callee, false );
	            duet.ready();
	        }, false );

	    // If IE event model is used
	    } else if ((<any>window.document).attachEvent ) {
	        // ensure firing before onload,
	        // maybe late but safe also for iframes
	        (<any>window.document).attachEvent("onreadystatechange", function(){
	            if ( window.document.readyState === "complete" ) {
	                (<any>window.document).detachEvent( "onreadystatechange", arguments.callee );
	            	duet.ready();
	            }
	        });

	        // If IE and not an iframe
	        // continually check to see if the window.document is ready
	        if ((<any>window.document).documentElement.doScroll && window == window.top ) (function(){
	            if (duet.isReady) return;

	            try {
	                // If IE is used, use the trick by Diego Perini
	                // http://javascript.nwbox.com/IEContentLoaded/
	                (<any>window.document).documentElement.doScroll("left");
	            } catch( error ) {
	                setTimeout( arguments.callee, 0 );
	                return;
	            }

	            // and execute any waiting functions
	            duet.ready();
	        })();
	    }

	    // A fallback to window.onload, that will always work
	    window.onload = duet.ready;
	}

	private static ready(): void {
		if(!duet.isReady){
			duet.isReady = true;

			if(duet.model)
				duet.modelView = new ModelView("duet.model", duet.model);

			for(var model in duet.subModels)
				duet.subModelViews[model] = new ModelView(model, duet.subModels[model]);

			duet.readyComplete = true;

			if(duet.initCallback)
				duet.initCallback();
		}
	}
}