var request = require("request");

describe("My web page  ", function(){
	beforeEach(function(){
		browser.ignoreSynchronization=true;
	});	
	it(" should render home page",function(){
		browser.driver.get("http://localhost:3000/");
		console.log("Home page open successfully!");
	});
});

describe("Login page ", function(){
	it(" should render login view",function(){				
		browser.driver.get("http://localhost:3000/login");
		var currentUrl = browser.driver.getCurrentUrl();
		browser.driver.sleep(3000);
		expect(currentUrl).toMatch('/login');		
	});

	it("should sign in ",function(){
		browser.driver.get("http://localhost:3000/login");
		//Busca los elementos del formulario		
		var usuario = browser.driver.findElement(By.id('txtEmail'));				
		var password = browser.driver.findElement(By.id('txtPwd'));							
		var btnSubmit = browser.driver.findElement(By.id('btnSubmit'));
		//Llenar los campos
		usuario.sendKeys('test@mail.com');
		browser.driver.sleep(1500);
		password.sendKeys('1234');
		browser.driver.sleep(1500);		
		//Asegurar que los campos contienen lo que hemos ingresado
		expect(usuario.getAttribute('value')).toEqual('test@mail.com');
		expect(password.getAttribute('value')).toEqual('1234');				
		console.log('Field values matches our input!');
		btnSubmit.click();
		browser.driver.sleep(1500);				
	});
	it("should redirect logged in users into profile", function(){
		expect(browser.driver.getCurrentUrl()).toMatch("http://localhost:3000/profile");
		console.log("User logged in successfully!");
	});
});

describe("Signup page ", function(){
	it("signup page ",function(){
		browser.driver.get("http://localhost:3000/signup");
		//Busca los elementos del formulario		
		var usuario = browser.driver.findElement(By.id('txtEmail'));				
		var password = browser.driver.findElement(By.id('txtPwd'));							
		var btnSubmit = browser.driver.findElement(By.id('btnSubmit'));
		//Llenar los campos
		usuario.sendKeys('test2@mail.com');
		browser.driver.sleep(1500);
		password.sendKeys('1234');
		browser.driver.sleep(1500);		
		//Asegurar que los campos contienen lo que hemos ingresado
		expect(usuario.getAttribute('value')).toEqual('test2@mail.com');
		expect(password.getAttribute('value')).toEqual('1234');				
		console.log('Field values matches our input!');
		btnSubmit.click();
		browser.driver.sleep(1500);	
	});
	it("should redirect signed up users into profile", function(){
		expect(browser.driver.getCurrentUrl()).toMatch("http://localhost:3000/profile");
		console.log("User signed up successfully!");
	});
});