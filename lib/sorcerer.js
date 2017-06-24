'use strict'

var path = require('path');
var glob = require('glob');

var getParamNames = require('get-parameter-names');

var Context = require('./context');
var Resource = require('./resource');

sorcerer.Context = Context;

sorcerer.loadingInfo = null;

function sorcerer(config, callback)
{
	if(sorcerer.loadingInfo)
	{
		onError(new Error('Context is already loading'));
	}
	
	if(typeof config === 'string')
	{
		config = {
			packages: [{
				path: config,
			}],
		};
	}
	
	var context = new sorcerer.Context(config);
	
	var basePath = config.basePath || '';
	var packages = [];
	for(var i = 0; i < config.packages.length; i++)
	{
		var pkg = config.packages[i];
		if(!pkg.env || pkg.env === config.env || (Array.isArray(pkg.env) && pkg.env.indexOf(config.env) !== -1))
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
				context.log('Injecting utilities:');
				context.register('env', () => config.env);
				context.register('err', () => null);
				context.log('Loaded successfully.\n');
				if(typeof callback === 'function')
				{
					return context.invoke(callback);
				}
				else
				{
					return context.notify(callback);
				}
			}
			
			var pkg = packages[index];
			if(typeof pkg === 'string')
			{
				pkg = {path: pkg};
			}
			context.log('Loading package: ' + (pkg.name || pkg.path || '[' + index + ']'));
			
			for(var id in pkg.include)
			{
				context.addResource(new Resource(id, pkg.include[id]), pkg.decorate);
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
							
							sorcerer.loadingInfo = {
								context,
								name,
								registered: false,
							};
							var handle = (config.require || require)(path.resolve(file));
							if(!sorcerer.loadingInfo.registered)
							{
								context.register(name, handle, false);
							}
							sorcerer.loadingInfo = null;
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
		var errIndex = getParamNames(callback).indexOf('err');
		if(errIndex !== -1)
		{
			var array = [];
			array[errIndex] = e;
			callback.apply(context, array);
		}
		else
		{
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
	
	sorcerer.loadingInfo.registered = true;
	
	if(!handle)
	{
		handle = config;
	}
	return sorcerer.loadingInfo.context.register(config.name || sorcerer.loadingInfo.name, handle, config.decorate);
}

sorcerer.defineStatic = function(config, handle)
{
	if(!handle)
	{
		handle = config;
	}
	return sorcerer.define(config, () => handle);
}

sorcerer.decorate = function(config, handle)
{
	if(!handle)
	{
		handle = config;
		config = null;
	}
	config = Object.assign({decorate: true}, config || {});
	return sorcerer.define(config, handle);
}

module.exports = sorcerer;