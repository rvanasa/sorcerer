module.exports = {
	basePath: __dirname,
	verbose: true,
	env: 'prod',
	packages: [{
		env: 'prod',
		path: '/context',
	}, {
		path: '/lib',
	}, {
		name: 'globals',
		include: {
			Provided: 'PROVIDED',
		},
	}],
};