var sorcerer = require('..');

process.env.NODE_ENV = 'production';

var config = require('./sorc.config');

console.log(':: Testing default:');
sorcerer(config, (Main) =>
{
	console.log(Main);
	console.log(':: Testing development:');
	return sorcerer(config, 'development', 'Main');
}).catch(err => console.error(err.stack));