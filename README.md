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
- sorcerer.config.js
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
module.exports = {
	whateverYouWantHere: 'yeah'
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

#### /sorcerer.config.js
```js
module.exports = {
	basePath: __dirname, // default: execution directory
	verbose: true, // default: false
	env: 'prod', // default: no environment filter
	packages: [{
		env: 'prod',
		path: '/src',
	}, {
		name: 'globals', // optional
		include: { // note that you can use both `path` and `include` in the same package
			Example: 'Some example injection',
		},
	}],
};
```

#### /index.js
```js

// require externalized config
var config = require('./sorcerer.config.js');

// configure a directory
require('sorc')(config, (App) =>
{
	// You can use any file as an entry point
	console.log(App);
});

// or, configure a directory with a specified environment
require('sorc')(Object.assign(config, {
	env: 'test',
}), (App, Config) =>
{
	console.log(App, Config);
});

// or, configure a directory with error handling
require('sorc')(config, (err, App) =>
{
	if(err) return console.error(err);
	
	console.log(App);
});
```