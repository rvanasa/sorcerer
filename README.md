## A super simple Inversion of Control (IoC) framework.
#### Similar to the Java Spring Framework, but way more straightforward.

Someday I'll document this properly, but for now here's a typical usage example:

#### Example Project Layout
```
- src
  - App.js
  - Config.js
  - util
    - Decorator.js
- index.js
```

#### /src/App.js
```js
// all files in the provided directory use this general format
module.exports = function(Config)
{
	var app = {};
	console.log('Initialize some sort of app here');
	return app;
}
```

#### /src/Config.js
```js
module.exports = function()
{
	return {
		whateverYouWantHere: 'yeah'
	};
}
```

#### /src/util/Decorator.js
```js
module.exports = function(App)
{
	// this will evaluate since it is referencing an active resource
	App.name = 'Decorated App';
}
```

#### /index.js
```js
// configure a directory
require('sorc')(__dirname + '/src', (App) =>
{
	// You can use any file as an entry point
	console.log(App);
});

// or, configure a directory with arbitrary injections and more than one entry file
require('sorc')(__dirname + '/src', {
	express: require('express'),
	Config: {whateverYouWantHere: 'nah'}
}, (App, Config) =>
{
	console.log(App, Config);
});

// or, configure a directory with error handling
require('sorc')(__dirname + '/src', (err, App) =>
{
	if(err) return console.error(err);
	
	console.log(App);
});
```