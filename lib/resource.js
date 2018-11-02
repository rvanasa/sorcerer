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
	}
	
	request()
	{
		if(!this.promise)
		{
			this.promise = this.context.invoke(this.handle, this.params, true)
				.then(value =>
				{
					this.context.notify(this);
					return value;
				})
		}
		return this.promise;
	}
	
	getName()
	{
		return (this.pkg.name ? '/' + path.normalize(this.pkg.name).replace(/^\//, '') : '') + '::' + this.id;
	}
}