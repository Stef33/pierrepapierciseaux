var http                = require('http');
var express             = require('express');
var app                 = express();
var server              = require('http').createServer(app);
var io                  = require('socket.io')(server, { transports: ['polling', 'websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']});
var path                = require('path');
var morgan              = require('morgan');
var bodyParser          = require('body-parser');
var mongoose            = require('mongoose');
var bcrypt              = require('bcryptjs');
var jwt                 = require('jwt-simple');
mongoose.Promise        = global.Promise;
var User                = require('./models/User');

var JWT_SECRET = "Ethan10012016";

var users               = {};
var connections         = [];
var choices             = [];

var db                  = null;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rockpaperscissors', function(err, dbconn) {
    if(!err) {
        console.log("We are connected to the database !");
    } else {
        console.log(err);
    }
    db = dbconn;
});

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname + '/public')));

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));

server.listen(process.env.PORT || 8888, function() {
    console.log('Server listening on port 8888 !');
});

app.get('/', function(req, res) {
    res.render('index');
});

app.post('/', function(req, res, next) {
    User.findOne({username: req.body.username}, function(err, user) {
        bcrypt.compare(req.body.password, user.password, function(err, result) {
            if (result) {
                var token = jwt.encode(user.username, JWT_SECRET);
                io.sockets.emit('login', { username: user.username, token: token });
                next();
            } else {
                return res.status(400).send('Mot de passe érroné !');
            }
        });
    });
});

app.get('/signup', function(req, res) {
    res.render('signup');
});

app.post('/signup', function(req,res,next) {
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) {
            var newUser = new User({
                username: req.body.username,
                password: hash,
                bestscore: 0,
                score: 0
            });

            newUser.save(function(err) {
                if (err) {
                    io.sockets.emit('pseudonyme déjà utilisé');
                } else {
                    res.redirect('/');
                }
            });
        });
    });
});

// Lancé quand le joueur se connecte
io.sockets.on('connection', function(socket) {

    socket.auth = false;

    // Trouver tout les joueurs inscrits.
    User.find({}, function(err, docs) {
        if(err) {
            throw err;
        } else {
            io.sockets.emit('load users', docs);
        }
    });

    var user_added = false;

    var updateUsernames = function() {
        io.sockets.emit('liste des joueurs', Object.keys(users));
    };

    // Nouveau joueur
    socket.on('nouveau joueur', function(user, callback) {
        var token = user.token;
        var decoded = jwt.decode(token, JWT_SECRET);
        if(decoded == user.username) {
            socket.auth = true;

            console.log('Connection is authenticated !');
            if (user.username in users) {
                callback(false);
                console.log('User exist in Users');
            } else if (user.username == ''){
                callback(false);
                console.log('Username empty');
            } else {
                callback(true);
                socket.username = user.username;
                users[user.username] = socket;
                user_added = true;
                isAuthenticate = true;
                updateUsernames();
                console.log('[socket.io] %s has connected.', socket.username);

                if (Object.keys(users).length == 2) {
                    io.sockets.emit('debut de partie');
                }
            }
        } else {
            console.log('Not working !');
        }
    });

    // Sauvegarde des scores.
    var saveScore = function(username, bestscore, score) {
        User.findOneAndUpdate({ username: username }, {$set:{ bestscore: bestscore, score: score }}, {new: true}, function(err, user) {
            if (err) {
                throw err;
            } else {
                console.log(user);
            }
        });
    }

    // Ecoute du choix du joueur et sa soumission. C'est ici où toute la megie opère !
    socket.on('choix du joueur', function(choice) {
        choices.push({
            'joueur': socket.username,
            'choix': choice,
            'meilleurScore': socket.bestscore,
            'score': socket.score
        });
        console.log('[socket.io] %s.', socket.username, choice);

        // Une fois que les deux joueurs ont fait lesur choix
        // le vérifie qui est le gagnant
        if(choices.length == 2) {
            console.log('[socket.io] Les joueurs ont fait leur choix.');
            if (choices[0].choix === 'pierre') {
                if (choices[1].choix === 'pierre') {
                    var scoreUser0 = isNaN(choices[0].score);
                    scoreUser0 = scoreUser0 + 1;
                    var bestscore0 = isNaN(choices[0].meilleurScore);
                    var username0 = choices[0].joueur;
                    if (scoreUser0 > bestscore0) {
                        bestscore0 = scoreUser0;
                        saveScore(username0, bestscore0, scoreUser0);
                    } else {
                        var bestscore0 = isNaN(choices[0].meilleurScore);
                        bestscore0 = bestscore0 + 1;
                        saveScore(username0, bestscore0, scoreUser0);
                    }
                    var scoreUser1 = isNaN(choices[1].score);
                    scoreUser1 = scoreUser1 + 1;
                    var bestscore1 = isNaN(choices[1].meilleurScore);
                    var username1 = choices[1].joueur;
                    if (scoreUser1 > bestscore1) {
                        bestscore1 = scoreUser1;
                        saveScore(username1, bestscore1, scoreUser1);
                    } else {
                        var bestscore1 = isNaN(choices[1].meilleurScore);
                        bestscore1 = bestscore1 + 1;
                        saveScore(username1, bestscore1, scoreUser1);
                    }
                    io.sockets.emit('égalité', choices);
                } else if (choices[1].choix === 'papier') {
                    var scoreUser1 = isNaN(choices[1].score);
                    scoreUser1 = scoreUser1 + 2;
                    var bestscore1 = isNaN(choices[1].meilleurScore);
                    var username1 = choices[1].joueur;
                    if (scoreUser1 > bestscore1) {
                        bestscore1 = scoreUser1;
                        saveScore(username1, bestscore1, scoreUser1);
                    } else {
                        var bestscore1 = isNaN(choices[1].meilleurScore);
                        bestscore1 = bestscore1 + 2;
                        saveScore(username1, bestscore1, scoreUser1);
                    }
                    io.sockets.emit('joueur 2 gagne', choices);
                } else if (choices[1].choix === 'ciseaux') {
                    var scoreUser0 = isNaN(choices[0].score);
                    scoreUser0 = scoreUser0 + 2;
                    var bestscore0 = isNaN(choices[0].meilleurScore);
                    var username0 = choices[0].joueur;
                    if (scoreUser0 > bestscore0) {
                        bestscore0 = scoreUser0;
                        saveScore(username0, bestscore0, scoreUser0);
                    } else {
                        var bestscore0 = isNaN(choices[0].meilleurScore);
                        bestscore0 = bestscore0 + 2;
                        saveScore(username0, bestscore0, scoreUser0);
                    }
                    io.sockets.emit('joueur 1 gagne', choices);
                }
                choices = [];
            } else if (choices[0].choix === 'papier') {
                if (choices[1].choix === 'pierre') {
                    var scoreUser0 = isNaN(choices[0].score);
                    scoreUser0 =  scoreUser0 + 2;
                    var bestscore0 = isNaN(choices[0].meilleurScore);
                    var username0 = choices[0].joueur;
                    if (scoreUser0 > bestscore0) {
                        bestscore0 = scoreUser0;
                        saveScore(username0, bestscore0, scoreUser0);
                    } else {
                        var bestscore0 = isNaN(choices[0].meilleurScore);
                        bestscore0 = bestscore0 + 2;
                        saveScore(username0, bestscore0, scoreUser0);
                    }
                    io.sockets.emit('joueur 1 gagne', choices);
                } else if (choices[1].choix === 'papier') {
                    var scoreUser0 = isNaN(choices[0].score);
                    scoreUser0 = scoreUser0 + 1;
                    var bestscore0 = isNaN(choices[0].meilleurScore);
                    var username0 = choices[0].joueur;
                    if (scoreUser0 > bestscore0) {
                        bestscore0 = scoreUser0;
                        saveScore(username0, bestscore0, scoreUser0);
                    } else {
                        var bestscore0 = isNaN(choices[0].meilleurScore);
                        bestscore0 = bestscore0 + 1;
                        saveScore(username0, bestscore0, scoreUser0);
                    }
                    var scoreUser1 = isNaN(choices[1].score);
                    scoreUser1 = scoreUser1 + 1;
                    var bestscore1 = isNaN(choices[1].meilleurScore);
                    var username1 = choices[1].joueur;
                    if (scoreUser1 > bestscore1) {
                        bestscore1 = scoreUser1;
                        saveScore(username1, bestscore1, scoreUser1);
                    } else {
                        var bestscore1 = isNaN(choices[1].meilleurScore);
                        bestscore1 = bestscore1 + 1;
                        saveScore(username1, bestscore1, scoreUser1);
                    }
                    io.sockets.emit('égalité', choices);
                } else if (choices[1].choix === 'ciseaux') {
                    var scoreUser1 = isNaN(choices[1].score);
                    scoreUser1 = scoreUser1 + 2;
                    var bestscore1 = isNaN(choices[1].meilleurScore);
                    var username1 = choices[1].joueur;
                    if (scoreUser1 > bestscore1) {
                        bestscore1 = scoreUser1;
                        saveScore(username1, bestscore1, scoreUser1);
                    } else {
                        var bestscore1 = isNaN(choices[1].meilleurScore);
                        bestscore1 = bestscore1 + 2;
                        saveScore(username1, bestscore1, scoreUser1);
                    }
                    io.sockets.emit('joueur 2 gagne', choices);
                }
                choices = [];
            } else if (choices[0].choix === 'ciseaux') {
                if (choices[1].choix === 'pierre') {
                    var scoreUser1 = isNaN(choices[1].score);
                    scoreUser1 = scoreUser1 + 2;
                    var bestscore1 = isNaN(choices[1].meilleurScore);
                    var username1 = choices[1].joueur;
                    if (scoreUser1 > bestscore1) {
                        bestscore1 = scoreUser1;
                        saveScore(username1, bestscore1, scoreUser1);
                    } else {
                        var bestscore1 = isNaN(choices[1].meilleurScore);
                        bestscore1 = bestscore1 + 2;
                        saveScore(username1, bestscore1, scoreUser1);
                    }
                    io.sockets.emit('joueur 2 gagne', choices);
                } else if (choices[1].choix === 'papier') {
                    var scoreUser0 = isNaN(choices[0].score);
                    scoreUser0 = scoreUser0 + 2;
                    var bestscore0 = isNaN(choices[0].meilleurScore);
                    var username0 = choices[0].joueur;
                    if (scoreUser0 > bestscore0) {
                        bestscore0 = scoreUser0;
                        saveScore(username0, bestscore0, scoreUser0);
                    } else {
                        var bestscore0 = isNaN(choices[0].meilleurScore);
                        bestscore0 = bestscore0 + 2;
                        saveScore(username0, bestscore0, scoreUser0);
                    }
                    io.sockets.emit('joueur 1 gagne', choices);
                } else if (choices[1].choix === 'ciseaux') {
                    var scoreUser0 = isNaN(choices[0].score);
                    scoreUser0 = scoreUser0 + 1;
                    var bestscore0 = isNaN(choices[0].meilleurScore);
                    var username0 = choices[0].joueur;
                    if (scoreUser0 > bestscore0) {
                        bestscore0 = scoreUser0;
                        saveScore(username0, bestscore0, scoreUser0);
                    } else {
                        var bestscore0 = isNaN(choices[0].meilleurScore);
                        bestscore0 = bestscore0 + 1;
                        saveScore(username0, bestscore0, scoreUser0);
                    }
                    var scoreUser1 = isNaN(choices[1].score);
                    scoreUser1 = scoreUser1 + 1;
                    var bestscore1 = isNaN(choices[1].meilleurScore);
                    var username1 = choices[1].joueur;
                    if (scoreUser1 > bestscore1) {
                        bestscore1 = scoreUser1;
                        saveScore(username1, bestscore1, scoreUser1);
                    } else {
                        var bestscore1 = isNaN(choices[1].meilleurScore);
                        bestscore1 = bestscore1 + 1;
                        saveScore(username1, bestscore1, scoreUser1);
                    }
                    io.sockets.emit('égalité', choices);
                }
                choices = [];
            }
        }
    });

    // Envoyer des messages pendant la partie.
    socket.on('envoyer message', function(data, callback) {
        var message = data.trim();
        if (message.substr(0, 3) === '/w ') {
            message = message.substr(3);
            var ind = message.indexOf('');
            if (ind !== -1) {
                var name = message.substring(0, ind);
                var message = message.substring(ind + 1);
                if (name in users) {
                    users[name].emit('whisper', { message: message, user: socket.username });
                    console.log('Whisper !');
                } else {
                    callback('Erreur ! Entrer un pseudonyme valide !');
                }
            } else {
                callback('Erreur ! Taper un message pour votre whisper.');
            }
        } else if (choices.length == 2 || !message == '') {
            io.sockets.emit('nouveau message', { message: message, user: socket.username });
        }
    });

    // Deconnexion du joueur
    socket.on('disconnect', function(data){
        // Enlève le joueur de la liste des joueurs et relance le jeu.
        if(!socket.username) return;
        socket.auth = false;
        delete users[socket.username];
        updateUsernames();
        console.log('[socket.io] %s has disconnected.', socket.username);
        choices = [];
    });

    // On déconnecte la socket si la connexion n'est pas authentifiée.
    /*setTimeout(function() {
        if(!socket.auth) {
            socket.disconnect();
        }
    }, 1000);*/

});
