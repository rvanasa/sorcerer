module.exports = {
	basePath: __dirname,
	verbose: true,
	env: 'prod',
	packages: [{
		env: 'prod',
		path: '/context',
	}, '/lib', {
		name: 'globals',
		include: {
			Provided: () => 'PROVIDED',
		},
	}],
};