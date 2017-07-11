module.exports = {
	basePath: __dirname,
	verbose: true,
	packages: ['/lib', {
		env: 'production',
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