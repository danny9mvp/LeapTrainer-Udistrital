/*
	Para correr el test hay que seguir estos pasos:
	1) Ejecutar el servidor Selenium:
	   webdriver-manager update
	   webdriver-manager start
	2) Ejecutar el test con protractor:
	   protractor conf.js
*/
exports.config={
	directConnect: true,
	capabilities: {
		'browserName' : 'firefox'},
		framework: 'jasmine2',
		specs: ['test.js']
};