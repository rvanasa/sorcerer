'use strict'

var path = require('path');

var getParamNames = require('get-parameter-names');

module.exports = class Resource
{
	constructor(id, context, pkg, handle)
	{
		this.id = id;
		this.context = context;
		this.pkg = pkg;
		this.handle = handle;
		this.params = getParamNames(handle);
		
		this.promise = null;
		this.loaded = false;
		this.value = undefined;
	}
	
	request()
	{
		if(this.loaded)
		{
			return Promise.resolve(this.value);
		}
		
		if(!this.promise)
		{
			this.promise = this.context.invoke(this.handle, this.params)
				.then(value =>
				{
					this.loaded = true;
					this.value = value;
					// return this.context.notify(this.id);
					
					this.context.notify(this.id)
						.catch(err => console.error(err.stack || err));
					
					return this.value;
				})
				// .then(() => this.value);
		}
		return this.promise;
	}
	
	getName()
	{
		return (this.pkg.name ? '/' + path.normalize(this.pkg.name).replace(/^\//, '') : '') + '::' + this.id;
	}
}