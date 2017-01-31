'use strict'

var path = require('path');
var glob = require('glob');

var getParamNames = require('get-parameter-names');

function sorcerer()
{
	var context = {};
	
	var args = arguments;
	
	var callback = args[args.length - 1];
	
	var listeners = {};
	context.$listen = function(id, resource)
	{
		var array = listeners[id] || (listeners[id] = []);
		array.push(resource);
	}
	
	context.$notify = function(id)
	{
		var array = listeners[id];
		if(array)
		{
			for(var i = 0; i < array.length; i++)
			{
				array[i].request();
			}
		}
	}
	
	context.$find = function(id)
	{
		if(!context.hasOwnProperty(id))
		{
			throw new Error('Resource not found: `' + id + '`');
		}
		return context[id].request();
	}
	
	context.$invoke = function(fn, params)
	{
		var names = params || getParamNames(fn);
		var values = Array(names.length);
		for(var i = 0; i < names.length; i++)
		{
			values[i] = context.$find(names[i]);
		}
		return fn.apply(context, values);
	}
	
	context.$register = function(id, handle)
	{
		if(typeof handle !== 'function')
		{
			throw new Error('Invalid resource: ' + handle);
		}
		context[id] = context.$resource(id, handle);
	}
	
	context.$resource = function(id, handle)
	{
		var params = getParamNames(handle);
		var resource = {
			id, handle,
			loaded: false,
			value: undefined,
			params,
			request()
			{
				if(!this.loaded) 
				{
					this.loaded = true;
					this.value = context.$invoke(this.handle, this.params);
					context.$notify(this.id);
				}
				return this.value;
			}
		};
		
		for(var i = 0; i < params.length; i++)
		{
			context.$listen(params[i], resource);
		}
		return resource;
	}
	
	init(0);
	function init(index)
	{
		try
		{
			if(index >= args.length - 1)
			{
				context.$register('err', () => null);
				return context.$invoke(callback);
			}
			
			var provider = args[index];
			if(typeof provider === 'string')
			{
				glob(path.join(provider, '**/*'), {nodir: true}, (err, files) =>
				{
					if(err) return onError(err);
					try
					{
						for(var i = 0; i < files.length; i++)
						{
							var file = files[i];
							var nameIndex = file.lastIndexOf('/');
							var name = file.substring(nameIndex + 1, file.indexOf('.', nameIndex));
							context.$register(name, require(path.resolve(file)));
						}
						init(index + 1);
					}
					catch(e)
					{
						onError(e);
					}
				});
			}
			else
			{
				for(let id in provider)
				{
					if(provider.hasOwnProperty(id))
					{
						context.$register(id, () => provider[id]);
					}
				}
				init(index + 1);
			}
		}
		catch(e)
		{
			onError(e);
		}
	}
	
	function onError(e)
	{
		var errIndex = getParamNames(callback).indexOf('err');
		if(errIndex !== -1)
		{
			var array = [];
			array[errIndex] = e;
			callback.apply(context, array);
		}
		else
		{
			console.error(e.stack);
		}
	}
	
	return context;
}

module.exports = sorcerer;