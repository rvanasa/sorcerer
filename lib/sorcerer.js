'use strict'

var path = require('path');
var glob = require('glob');

var Context = require('./context');
// var Resource = require('./resource');

sorcerer.Context = Context;
sorcerer.loadingInfo = null;

function sorcerer(config, env, callback)
{
	if(sorcerer.loadingInfo)
	{
		return Promise.reject(new Error('Context is already loading'));
	}
	
	if(typeof config === 'string')
	{
		config = {
			verbose: true,
			packages: [{
				path: config,
			}],
		};
	}
	
	if(arguments.length < 3)
	{
		callback = env;
		env = config.env || process.env.NODE_ENV;
	}
	
	var context = config.context ? config.context(config, env) : new sorcerer.Context(config, env);
	
	var basePath = config.basePath || '.';
	var packages = [];
	for(var i = 0; i < config.packages.length; i++)
	{
		var pkg = config.packages[i];
		if(!pkg.env || pkg.env === env || (Array.isArray(pkg.env) && pkg.env.indexOf(env) !== -1))
		{
			packages.push(pkg);
		}
	}
	
	function init(index)
	{
		return new Promise((resolve, reject) =>
		{
			try
			{
				if(index >= packages.length)
				{
					if(callback)
					{
						return resolve(typeof callback === 'string' ? context.find(callback) : context.invoke(callback));
					}
					else
					{
						return resolve(context);
					}
				}
				
				var pkg = packages[index];
				if(typeof pkg === 'string')
				{
					pkg = {path: pkg};
				}
				if(!pkg.name)
				{
					pkg.name = pkg.path || '[' + index + ']';
				}
				
				for(var id in pkg.include)
				{
					context.register(id, pkg, pkg.include[id], pkg.eager);
				}
				
				if(pkg.path)
				{
					glob(path.join(basePath, pkg.path, '**/*'), {nodir: true, ignore: pkg.ignore}, (err, files) =>
					{
						if(err) return reject(err);
						try
						{
							for(var file of files)
							{
								var nameIndex = file.lastIndexOf('/');
								var name = file.substring(nameIndex + 1, file.indexOf('.', nameIndex));
								
								sorcerer.loadingInfo = {
									context,
									name,
									file,
									pkg,
									registered: false,
								};
								var handle = (config.require || require)(path.resolve(file));
								if(!sorcerer.loadingInfo.registered)
								{
									context.register(name, pkg, handle, pkg.eager);
								}
								sorcerer.loadingInfo = null;
							}
							return resolve(init(index + 1));
						}
						catch(e)
						{
							return reject(e);
						}
					});
				}
				else
				{
					return resolve(init(index + 1));
				}
			}
			catch(e)
			{
				return reject(e);
			}
		});
	}
	return init(0).then(() => context);
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
	return sorcerer.loadingInfo.context.register(config.name || sorcerer.loadingInfo.name, sorcerer.loadingInfo.pkg, handle, config.eager);
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
	config = Object.assign({eager: true}, config || {});
	return sorcerer.define(config, handle);
}

module.exports = sorcerer;