module.exports = function () {


var db = require('../../config/db-connection')();

var Schema = require('mongoose').Schema;
var xxxx = Schema({
  
   

  
});

var Task = Schema({
  
    name: String,
    pose: Boolean,
    datoss: 
    [
    	[ 
    		{
    			x: {formType: String},

			    y: {formType: String},

			    z: {formType: String},

    			stroke: Number

    		}
    	]
    ]
  
});




// create the model for user and expose it to our app
return db.model('Gesto', Task);
}