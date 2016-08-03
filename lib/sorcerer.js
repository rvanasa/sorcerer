'use strict'

var glob = require('glob');

var getParamNames = require('get-parameter-names');

var Resource = require('plasma').Resource;

function find(callback)
{
	var resources = [];
	for(var param of getParamNames(callback))
	{
		var resource = this[param];
		if(resource) resources.push(resource);
		else throw new Error('Resource not found: ' + resource);
	}
	Resource.all(resources, (values) => callback.apply(this, values));
}

function buildResource(id, config)
{
	if(typeof config === 'function')
	{
		config = {provider: config};
	}
	else if(config.id)
	{
		id = config.id;
	}
	else if(config.provider && config.provider.name)
	{
		id = config.provider.name;
	}
	
	var resource = new Resource();
	resource.id = id;
	resource.eager = true;
	
	if(config.provider)
	{
		resource.params = getParamNames(config.provider);
		resource.provider = function(done)
		{
			Resource.all(resource.inputs, (values) =>
			{
				resource.provider = null;
				var result = config.provider.apply(resource, values);
				done(result);
			});
		}
	}
	
	return resource;
}

function initResource(context, id)
{
	var resource = context[id];
	if(resource instanceof Resource && resource.params)
	{
		for(var i = 0; i < resource.params.length; i++)
		{
			var param = resource.params[i];
			var input = context[param];
			
			if(!input) throw new Error('Resource not found: ' + resource.id + ' -> `' + param + '`');
			resource.addInput(input);
		}
	}
}

function sorcerer()
{
	var context = Object.create(null);
	
	context.context = context;
	context.find = find;
	
	var inputs = [].slice.call(arguments, 0, -1);
	var callback = arguments[arguments.length - 1];
	
	var providers = [];
	
	for(var input of inputs)
	{
		if(typeof input === 'string')
		{
			providers.push(Resource.lightAsync((done) =>
			{
				glob(input + '/**/*.*', (err, files) =>
				{
					// if(err) return callback(err);
					if(err) throw err;
					
					for(var file of files)
					{
						var id = file.substring(file.lastIndexOf('/') + 1, file.lastIndexOf('.')).replace(/-[A-Za-z]/g, value => value.substring(1).toUpperCase());
						var config = require(file);
						
						if(context[id]) throw new Error('Resource already exists: `' + id + '`');
						context[id] = buildResource(id, config);
					}
					
					done();
				});
			}));
		}
		else
		{
			Object.assign(context, input);
		}
	}
	
	Resource.all(providers, () =>
	{
		for(var id in context)
		{
			initResource(context, id);
		}
		
		context.find(callback);
	});
}

module.exports = sorcerer;