'use strict'

var path = require('path');
var glob = require('glob');

var async = require('async');
var getParamNames = require('get-parameter-names');

class Context
{
	constructor(config)
	{
		this.config = config;
		
		this.resources = {};
		this.listeners = {};
	}
	
	listen(id, resource)
	{
		var array = this.listeners[id] || (this.listeners[id] = []);
		array.push(resource);
	}
	
	notify(id, done)
	{
		var resources = this.listeners[id];
		if(resources)
		{
			async.map(resources, (resource, cb) => resource.request(this, cb), done);
		}
		else if(done)
		{
			done(null);
		}
	}
	
	find(id, done)
	{
		if(!this.resources[id])
		{
			done(new Error('Resource not found: `' + id + '`'));
		}
		else
		{
			return this.resources[id].request(this, done);
		}
	}
	
	invoke(fn, params, done)
	{
		params = params || getParamNames(fn);
		async.map(params, (param, cb) => this.find(param, cb), (err, values) =>
		{
			if(err)
			{
				if(!done) throw err;
				return done(err);
			}
			
			var result = fn.apply(this, values);
			if(done)
			{
				done(err, result);
			}
		});
	}
	
	register(id, value)
	{
		var resource = new Resource(id, this.createHandle(value));
		this.addResource(resource);
	}
	
	createHandle(value)
	{
		return typeof value === 'function' ? value : () => value;
	}
	
	addResource(resource)
	{
		this.resources[resource.id] = resource;
		for(var i = 0; i < resource.params.length; i++)
		{
			this.listen(resource.params[i], resource);
		}
		this.log('+ `' + resource.id + '`');
		return resource;
	}
	
	log(message)
	{
		if(this.config.verbose)
		{
			console.log(message);
		}
	}
}

class Resource
{
	constructor(id, handle)
	{
		this.id = id;
		this.handle = handle;
		this.params = getParamNames(handle);
		
		this.callbacks = [];
		this.loading = false;
		this.loaded = false;
		this.value = undefined;
	}
	
	request(context, done)
	{
		if(!this.loaded) 
		{
			if(done)
			{
				this.callbacks.push(done);
			}
			
			this.loading = true;
			context.invoke(this.handle, this.params, (err, value) =>
			{
				this.loading = false;
				if(err)
				{
					for(var i = 0; i < this.callbacks.length; i++)
					{
						this.callbacks[i](err);
					}
				}
				else
				{
					this.loaded = true;
					this.value = value;
					for(i = 0; i < this.callbacks.length; i++)
					{
						this.callbacks[i](null, value);
					}
				}
				this.callbacks.length = 0;
				if(!err)
				{
					context.notify(this.id);
				}
			});
		}
		else
		{
			return done ? done(null, this.value) : this.value;
		}
	}
}

sorcerer.Context = Context;

sorcerer.loadingInfo = null;

function sorcerer(config, callback)
{
	if(sorcerer.loadingInfo)
	{
		onError(new Error('Context is already loading'));
	}
	
	var context = new sorcerer.Context(config);
	sorcerer.loadingInfo = {
		context,
		name: null,
	};
	
	var basePath = path.join(config.basePath || '');
	var packages = [];
	for(var i = 0; i < config.packages.length; i++)
	{
		var pkg = config.packages[i];
		if(!pkg.env || pkg.env === config.env || (Array.isArray(pkg.env) && pkg.env.includes(config.env)))
		{
			packages.push(pkg);
		}
	}
	
	init(0);
	function init(index)
	{
		try
		{
			if(index >= packages.length && callback)
			{
				sorcerer.loadingInfo = null;
				context.register('err', () => null);
				context.log('Loaded successfully.');
				return context.invoke(callback);
			}
			
			var pkg = packages[index];
			context.log('Loading package: ' + (pkg.name || pkg.path || '[' + index + ']'));
			
			for(var id in pkg.include)
			{
				context.addResource(new Resource(id, () => pkg.include[id]));
			}
			
			if(pkg.path)
			{
				glob(path.join(basePath, pkg.path, '**/*'), {nodir: true, ignore: pkg.ignore}, (err, files) =>
				{
					if(err) return onError(err);
					try
					{
						for(var i = 0; i < files.length; i++)
						{
							var file = files[i];
							var nameIndex = file.lastIndexOf('/');
							var name = file.substring(nameIndex + 1, file.indexOf('.', nameIndex));
							
							sorcerer.loadingInfo.name = name;
							var handle = require(path.resolve(file));
							if(handle)
							{
								context.register(name, handle);
							}
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
		sorcerer.loadingInfo = null;
		var errIndex = getParamNames(callback).indexOf('err');
		if(errIndex !== -1)
		{
			var array = [];
			array[errIndex] = e;
			callback.apply(context, array);
		}
		else
		{
			// console.error(e.stack);
			throw e;
		}
	}
	
	return context;
}

sorcerer.define = function(config, handle)
{
	if(!sorcerer.loadingInfo)
	{
		throw new Error('No context is currently loading');
	}
	
	if(!handle)
	{
		handle = config;
	}
	else
	{
		sorcerer.loadingInfo.context.register(config.name || sorcerer.loadingInfo.name, handle);
	}
}

module.exports = sorcerer;