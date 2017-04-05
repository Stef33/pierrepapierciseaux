$(function(){

    var socket              = io.connect();
    var $registrationForm   = $('#registrationForm');
    var $messageForm        = $('#messageForm');
    var $message            = $('#message');
    var $chat               = $('#chat');
    var $messageArea        = $('#messageArea');
    var $userFormArea       = $('#userFormArea');
    var $userForm           = $('#userForm');
    var $username           = $('#username');
    var $users              = $('#users');
    var $userError          = $('#userError');
    var $signupError        = $('#signupError');
    var $password           = $('#password');
    var $userscores         = $('#userscores');
    var submited            = false;

    // Vérification authentification du joueur.
    socket.on('login', function(user, token) {
        var token = user.token;
        if( $username.val() == user.username ) {
            var user = { username : $username.val(), token : token };
            socket.emit('nouveau joueur', user, function(data) {
                if(data) {
                    $userFormArea.hide();
                    $messageArea.show();
                } else {
                    $userError.html('Pseudonyme non valide ou déjà utilisé. Merci d\'en choisir un autre.');
                }
            });
            $username.val('');
            $password.val('');
        }
    });

    // Affichage message d'erreur en cas d'un pseudo déjàutilisé.
    socket.on('pseudonyme déjà utilisé', function(data) {
        $signupError.html('Ce pseudonyme est déjà utilisé, veuillez en choisir un autre. Merci.');
    });

    // Soumission des messages tapés par les joueurs.
    $messageForm.submit(function(e) {
        e.preventDefault();
        socket.emit('envoyer message', $message.val(), function(data) {
            $chat.append('<div class="well"><span class="error"><b>' + data + '</b></span></div>');
        });
        $message.val('');
    });

    // Affichage des message tapés par les joueurs.
    socket.on('nouveau message', function(data) {
        $chat.append('<div class="well"><span class="message glyphicon glyphicon-user user-icon">' + ' ' + '<b>' + data.user + ' : </b>' + data.message + '</span></div>');
    });

    // Affichage message secret, mais pas nécessaire ici.
    /*socket.on('whisper', function(data) {
        $chat.append('<div class="well"><span class="whisper"><b>' + data.user + ' : </b>' + data.message + '</span></div>');
    });*/

    // Affichage de début de partie.
    socket.on('debut de partie', function(data) {
        $chat.append('<div class="well"><span class="info"><b>Info : </b>Faites votre choix !</span></div>');
    });

    // Affichage des joueurs connectés.
    socket.on('liste des joueurs', function(data) {
        var html = '';
        for (var i = 0; i < data.length; i++) {
            html += '<li class="list-group-item"><span class="glyphicon glyphicon-user user-icon">' + data[i] +'</span></li>';
        }
        $users.html(html);
    });

    // Affichage de la liste se tout les joueurs et leur meilleur score.
    socket.on('load users', function(docs) {
        var html = '';
        for (var i = 0; i < docs.length; i++) {
            html += '<li class="list-group-item"><span>' + docs[i].username +' : '+ docs[i].bestscore + '</span></li>';
        }
        $userscores.html(html);
    });

    // Soumission du choix du joueur.
    $('.game').click(function() {
        if(!submited) {
            var choice = $('input[name=choice]:checked').val();
            socket.emit('choix du joueur', choice);
            $chat.append('<div class="well"><span class="info"><b>Info : </b>En attente de l\' autre joueur...</span></div>');
            submited = true;
        } else {
            $chat.append('<div class="well"><span class="info"><b>Info : </b>Vous avez déjà fait un choix...</span></div>');
        }
    });

    // Décompte pour ajouter du suspens
    var countdown = function(choices) {
        setTimeout(function() {
            $chat.prepend('<div class="well"><span class="info"><b>Info : </b>3...</span></div>');
        }, 0);
        setTimeout(function() {
            $chat.prepend('<div class="well"><span class="info"><b>Info : </b>2...</span></div>');
        }, 1000);
        setTimeout(function() {
            $chat.prepend('<div class="well"><span class="info"><b>Info : </b>1...</span></div>');
        }, 2000);
        setTimeout(function() {
            $chat.prepend('<div class="well"><span class="info"><b>Info : </b>' + choices[0]['joueur'] + ' a choisi ' + choices[0]['choix'] +'</span></div>');
        }, 3000);
        setTimeout(function() {
            $chat.prepend('<div class="well"><span class="info"><b>Info : </b>' + choices[1]['joueur'] + ' a choisi ' + choices[1]['choix'] +'</span></div>');
        }, 4000);
    };

    // Affichage en cas d'égalité
    socket.on('égalité', function(choices) {
        countdown(choices);
        setTimeout(function() {
            $chat.prepend('<div class="well"><span class="result"><b>Info : </b>C\'est une égalité.</span></div>');
        }, 5000);
        submited = false;
    });

    // Affichage si le premier joueur dans la liste gagne
    socket.on('joueur 1 gagne', function(choices) {
        countdown(choices);
        setTimeout(function() {
            $chat.prepend('<div class="well"><span class="result"><b>Info : </b>' + choices[0]['joueur'] + ' a gagné !</span></div>');
        }, 5000);
        submited = false;
    });

    // Affichage si le second joueur dans la liste gagne
    socket.on('joueur 2 gagne', function(choices) {
        countdown(choices);
        setTimeout(function() {
            $chat.prepend('<div class="well"><span class="result"><b>Info : </b>' + choices[1]['joueur'] + ' a gagné !</span></div>');
        }, 5000);
        submited = false;
    });
});
