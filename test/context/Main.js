module.exports = function(Provided, Static)
{
	return JSON.stringify(Provided + ':' + Static);
}