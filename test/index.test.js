var sorcerer = require('..');

process.env.NODE_ENV = 'production';

console.log(':: Testing production:');
sorcerer(require('./sorcerer.config'), (Main) =>
{
	console.log(Main);
	console.log(':: Testing development:');
	return sorcerer(require('./sorcerer.config'), 'development', 'Main');
}).then(console.log);