var sorcerer = require('..');

process.env.NODE_ENV = 'production';

sorcerer(require('./sorcerer.config'), (err, Main) =>
{
	if(err) return console.error(err.stack || err);
	console.log(Main);
});