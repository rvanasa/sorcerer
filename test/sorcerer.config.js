module.exports = {
	basePath: __dirname,
	verbose: true,
	env: 'prod',
	packages: ['/lib', {
		env: 'prod',
		path: '/context',
	}, {
		path: '/patch',
		decorate: true,
	}, {
		name: 'globals',
		include: {
			Provided: () => 'PROVIDED',
		},
	}],
};