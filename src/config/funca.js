const mongoose = require('mongoose');

const Gesto = new mongoose.Schema({
  
    name: String,
    pose: Boolean,
    data: {x:String,y:String,z:String}
  
});


function guarbase( name, pose,data) {

	
	
    Gesto.findOne({'name': name}, function (err, gesto) {
      if (err) {
        return done(err);
      }
      if (gesto) {
        return done("");
      } else {
        var newgesto = new Gesto();
        newgesto.name = name;
        newgesto.pose = pose;
        newgesto.data = data;
        newgesto.save(function (err) {
          if (err) { throw err; }
          return done(null, newgesto);
        });
      }
    });

    
}; 
