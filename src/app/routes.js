var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
const express = require('express');
//const router = express.APpp();
const model =  require('./models/gesto')();
//require('./config/funca');

module.exports = (app, passport) => {

	// index routes
	app.get('/', (req, res) => {
		res.render('index');
		model.find({},(err,task)=>{
			if(err) throw err;
		})	
	});

	//login view
	app.get('/login', (req, res) => {
		res.render('login.ejs', {
			message: req.flash('loginMessage')
		});
	});

	app.post('/login', passport.authenticate('local-login', {
		successRedirect: '/profile',
		failureRedirect: '/login',
		failureFlash: true
	}));

	// signup view
	app.get('/signup', (req, res) => {
		res.render('signup', {
			message: req.flash('signupMessage')
		});
	});

	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect: '/profile',
		failureRedirect: '/signup',
		failureFlash: true // allow flash messages
	}));

	//profile view
	app.get('/profile', isLoggedIn, (req, res) => {
		res.render('profile', {
			user: req.user,
			gesto: req.gesto
		});
	});

	// logout
	app.get('/logout', (req, res) => {
		req.logout();
		res.redirect('/');
	});

	// add
	app.post('/add', (req, res) => {
		let body = req.body;

		var nombre = body.name;
		var isposes = body.pose;
		let data = body.data;
		//console.log(data);
		MongoClient.connect(url, function(err, db) {


		  if (err) throw err;
		  var dbo = db.db("login-node");

		  var myobj = {name:nombre,pose:isposes,data:data};

		  dbo.collection("DiccionarioGestos").insert(myobj, function(err, res) {
		    if (err) throw err;
		    //console.log("Number of documents inserted: " + res.insertedCount);
		    db.close();
		  });
});


		
	});
	app.post('/valoreseee',isLoggedIn, (req, res) => {
		MongoClient.connect(url, function(err, db) {
		  if (err) throw err;
		  var dbo = db.db("login-node");
		  dbo.collection("DiccionarioGestos").find({}).toArray(function(err, result) {
		    if (err) throw err;
		  //  console.log(result);
		    db.close();


		   //let jojo = {name:result.name,pose:result.isposes,data:result.data};

		    res.send(result);
		  });
		}); 

		
		//res.;

			
	});
};

function isLoggedIn (req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}

	res.redirect('/');
}