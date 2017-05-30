var sorcerer = require('..');

sorcerer(require('./sorcerer.config'), (err, Main) =>
{
	if(err) return console.error(err.stack || err);
	console.log(Main);
});