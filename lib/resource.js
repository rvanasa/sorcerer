'use strict'

function Resource(provider)
{
	this.provider = provider;
	
	this.inputs = [];
	this.listeners = [];
}

Resource.prototype = {
	constructor: Resource,
	addInput: function(input)
	{
		if(~this.listeners.indexOf(input))
		{
			throw new Error('Circular inputs:', this.id || this, ' ~ ', input.id || input);
		}
		this.inputs.push(input);
		input.listeners.push(this);
	},
	removeInput: function(input)
	{
		this.inputs.splice(this.inputs.indexOf(input), 1);
		input.listeners.splice(input.listeners.indexOf(this), 1);
	},
	request: function(callback, errCallback)
	{
		if(this.destroyed) throw new Error('Resource is destroyed' + (this.id ? ': ' + this.id : ''));
		if(this.resolved || !this.provider) return callback ? callback(this.value) : this.value;
	
		if(callback)
		{
			if(typeof callback !== 'function') throw new Error('Callback must be a function: ' + callback);
			
			if(this.callback)
			{
				var prev = this.callback;
				this.callback = function(value)
				{
					prev(value);
					callback(value);
				}
			}
			else this.callback = callback;
		}
		if(errCallback)
		{
			if(typeof errCallback !== 'function') throw new Error('Error callback must be a function: ' + errCallback);
			
			if(this.errCallback)
			{
				var prevErr = this.errCallback;
				this.errCallback = function(value)
				{
					prevErr(value);
					errCallback(value);
				}
			}
			else this.errCallback = errCallback;
		}
		
		if(!this.loading)
		{
			this.loading = true;
			this.provider(this.resolve.bind(this), this);
		}
		
		return this.value;
	},
	resolve: function(value)
	{
		this.loading = false;
		this.resolved = true;
		this.value = value;
		
		if(this.callback)
		{
			this.callback(value, this);
			this.callback = undefined;
		}
		
		this.notify(this);
	},
	reject: function(error)
	{
		this.loading = false;
		this.resolved = false;
		this.error = error;
		
		if(this.errCallback)
		{
			this.errCallback(error, this);
			this.errCallback = undefined;
		}
		
		if(this.recover)
		{
			this.recover(error, this);
		}
	},
	notify: function(source)
	{
		if(this.provider && source != this)
		{
			this.resolved = false;
			if(this.eager) this.request();
		}
		
		for(var i = 0; i < this.listeners.length; i++)
		{
			this.listeners[i].notify(source);
		}
	},
	destroy: function()
	{
		this.destroyed = true;
		var i = this.inputs.length;
		while(--i >= 0)
		{
			this.removeInput(this.inputs[i]);
		}
	},
	// find: function(id)
	// {
	// 	var children = this.children;
	// 	if(!children) return;
	// 	else if(typeof children === 'function')
	// 	{
	// 		return children.apply(this, [].slice.call(arguments));
	// 	}
	// 	else
	// 	{
	// 		var resource = children[id];
	// 		if(typeof resource === 'function')
	// 		{
	// 			resource = resource.apply(this, [].slice.call(arguments, 1));
	// 		}
	// 		return resource;
	// 	}
	// },
};

Resource.all = function(resources, callback)
{
	var results = [];
	var len = resources.length;
	if(len == 0) callback(results);
	var ct = len;
	for(var i = 0; i < len; i++)
	{
		request(i);
	}
	function request(i)
	{
		var resource = resources[i];
		var flag = true;
		function resolve(value)
		{
			results[i] = value;
			if(flag && --ct == 0)
			{
				flag = false;
				callback(results);
			}
		}
		resource.request(resolve);
	}
}

Resource.light = function(value)
{
	return {
		request: function(done) {done(value)}
	};
}

Resource.lightAsync = function(provider)
{
	return {request: provider};
}

Resource.static = function(value)
{
	var resource = new Resource();
	resource.resolve(value);
	return resource;
}

Resource.staticAsync = function(provider)
{
	var resource = new Resource();
	provider(resource.resolve.bind(resource), resource);
	return resource;
}

Resource.depend = function(inputs, syncProvider)
{
	if(!inputs) return new Resource(function(done) {done(syncProvider())});
	var resource = new Resource(function(callback)
	{
		Resource.all(resource.inputs, function(args)
		{
			var result = syncProvider.apply(resource, args);
			if(!resource.resolved) callback(result);
		});
	});
	if(!Array.isArray(inputs)) inputs = [inputs];
	for(var i = 0; i < inputs.length; i++)
	{
		var input = inputs[i];
		resource.addInput(input);
	}
	return resource;
}

Resource.dependAsync = function(inputs, asyncProvider)
{
	if(!inputs) return new Resource(asyncProvider);
	var resource = new Resource(function(callback)
	{
		Resource.all(resource.inputs, function(args)
		{
			asyncProvider.call(resource, args, callback);
		});
	});
	if(!Array.isArray(inputs)) inputs = [inputs];
	for(var i = 0; i < inputs.length; i++)
	{
		var input = inputs[i];
		resource.addInput(input);
	}
	return resource;
}

Resource.listen = function(inputs, callback)
{
	var resource = Resource.depend(inputs, callback);
	resource.eager = true;
	resource.request();
	return resource;
}

module.exports = Resource;