var mongoose = require('mongoose');

// Schema du model user
var userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    password: {
        type: String,
        required: true
    },
    score: {
        type: Number
    },
    bestscore: {
        type: Number
    }
});

// Créer le model et le passer à l'application
module.exports = mongoose.model('User', userSchema);
