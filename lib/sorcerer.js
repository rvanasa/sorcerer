'use strict'

var path = require('path');
var glob = require('glob');

var async = require('async');
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
	
	context.$notify = function(id, done)
	{
		var resources = listeners[id];
		if(resources)
		{
			async.map(resources, (resource, cb) => resource.request(cb), done);
		}
		else if(done)
		{
			done(null);
		}
	}
	
	context.$find = function(id, done)
	{
		if(!context.hasOwnProperty(id))
		{
			done(new Error('Resource not found: `' + id + '`'));
		}
		else
		{
			return context[id].request(done);
		}
	}
	
	context.$invoke = function(fn, params, done)
	{
		params = params || getParamNames(fn);
		async.map(params, (param, cb) => context.$find(param, cb), (err, values) =>
		{
			if(!done)
			{
				if(err) throw err;
			}
			var result = fn.apply(context, values);
			if(done)
			{
				done(err, result);
			}
		});
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
			params,
			request,
			callbacks: [],
			loading: false,
			loaded: false,
			value: undefined,
		};
		
		for(var i = 0; i < params.length; i++)
		{
			context.$listen(params[i], resource);
		}
		return resource;
	}
	
	function request(done)
	{
		if(!this.loaded) 
		{
			if(this.loading)
			{
				this.callbacks.push(done);
				return;
			}
			
			this.loading = true;
			context.$invoke(this.handle, this.params, (err, value) =>
			{
				this.loading = false;
				if(err) return done(err);
				this.loaded = true;
				this.value = value;
				if(done) done(null, value);
				for(var i = 0; i < this.callbacks.length; i++)
				{
					this.callbacks[i](null, value);
				}
				this.callbacks.length = 0;
				context.$notify(this.id);
			});
		}
		else
		{
			return done ? done(null, this.value) : this.value;
		}
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
							var handle = require(path.resolve(file));
							context.$register(name, handle);
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