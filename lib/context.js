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
		this.listeners = {};
		
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
	
	listen(id, resource)
	{
		var array = this.listeners[id] || (this.listeners[id] = []);
		if(array.indexOf(resource) === -1)
		{
			array.push(resource);
		}
	}
	
	notify(id)
	{
		var resource = this.resources[id];
		if(!resource)
		{
			return Promise.reject(new Error('Resource not found: `' + id + '`'));
		}
		
		this.log('=> ' + resource.getName());
		
		var resources = this.listeners[id] || [];
		return Promise.all(resources.map(resource => resource.request()));
	}
	
	find(id)
	{
		if(!this.resources[id])
		{
			return Promise.reject(new Error('Resource not found: `' + id + '`'));
		}
		return this.resources[id].request();
	}
	
	invoke(fn, params)
	{
		params = params || getParamNames(fn);
		return Promise.all(params.map(id => this.find(id)))
			.then(values => fn.apply(this, values));
	}
	
	register(id, pkg, value, isDecorator)
	{
		var resource = new Resource(id, this, pkg, this.createHandle(value));
		this.addResource(resource, isDecorator);
	}
	
	createHandle(value)
	{
		return typeof value === 'function' ? value : () => value;
	}
	
	addResource(resource, isDecorator)
	{
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
		// this.log((isDecorator ? '*' : '+') + ' `' + resource.id + '`');
		return resource;
	}
	
	log(message)
	{
		if(this.verbose)
		{
			console.log(colors.cyan(message));
		}
	}
}