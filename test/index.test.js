var sorcerer = require('..');

var Provided = 'PROVIDED';

sorcerer({Provided}, __dirname + '/context', (err, Main) =>
{
	if(err) return console.error(err.stack);
	console.log(Main);
});