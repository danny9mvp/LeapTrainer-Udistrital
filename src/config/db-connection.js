const mongoose = require('mongoose');
let db;
module.exports = function Connection() {
 if (!db) {
 	db = mongoose.createConnection('mongodb://localhost/login-node');
 }
return db;
}