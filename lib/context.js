'use strict'

var colors = require('colors');
var getParamNames = require('get-parameter-names');

var Resource = require('./resource');

module.exports = class Context
{
	constructor(config, env)
	{
		this.config = config;
		this.env = env;
		
		this.resources = {};
		this.decorators = {};
		this.queuePromise = Promise.resolve();
		
		if(typeof config.verbose === 'string')
		{
			this.verbose = config.verbose === env;
		}
		else if(Array.isArray(config.verbose))
		{
			this.verbose = config.verbose.indexOf(env) !== -1;
		}
		else
		{
			this.verbose = !!config.verbose;
		}
	}
	
	queue(step)
	{
		this.queuePromise = this.queuePromise.then(() => step);
		return Promise.resolve(step);
	}
	
	listen(id, resource)
	{
		var array = this.decorators[id] || (this.decorators[id] = []);
		if(array.indexOf(resource) === -1)
		{
			array.push(resource);
		}
	}
	
	notify(resource)
	{
		this.log('=> ' + resource.getName());
		
		var decorators = this.decorators[resource.id];
		if(decorators)
		{
			for(var decorator of decorators)
			{
				this.queue(decorator.request());
			}
		}
	}
	
	find(id, fast)
	{
		var resource = this.resources[id];
		if(!resource)
		{
			return this.queue(Promise.reject(new Error(`Resource not found: '${id}'`)));
		}
		return this.collect(this.queue(resource.request()), fast);
	}
	
	invoke(fn, params, fast)
	{
		params = params || getParamNames(fn);
		return this.collect(Promise.all(params.map(id => this.find(id, fast))), fast)
			.then(values => fn.apply(this, values));
	}
	
	collect(promise, fast)
	{
		return fast ? promise : promise.then(result => this.queuePromise.then(() => result));
	}
	
	register(id, pkg, value, isDecorator)
	{
		var resource = new Resource(id, this, pkg, this.createHandle(value));
		var prev = this.resources[resource.id];
		if(prev)
		{
			this.log(prev.getName() + ' >> ' + resource.getName());
		}
		
		this.resources[resource.id] = resource;
		if(isDecorator)
		{
			for(var i = 0; i < resource.params.length; i++)
			{
				this.listen(resource.params[i], resource);
			}
		}
		return resource;
	}
	
	createHandle(value)
	{
		if(this.config.format)
		{
			return this.config.format.call(this, value);
		}
		return typeof value === 'function' ? value : () => value;
	}
	
	log(message)
	{
		if(this.verbose)
		{
			console.log(colors.cyan(message));
		}
	}
}