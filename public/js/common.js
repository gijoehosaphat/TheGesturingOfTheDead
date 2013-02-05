var Game = (function () {
    var username = $("#username");
    var zombie = null;
    var socket = null;
    var game = null;

    var query = window.location.search;
    if (query) {
        var pairs = window.location.search.substr(1).split('&');
        for (var i in pairs) {
            var pair = pairs[i].split("=");
            if (pair[0].toLowerCase() === "username") {
                username.val(pair[1]);
                $(".find-a-game-button").removeClass("disabled");
            }
        }
    }

    $("#game, #pad").css({ width: window.outerWidth, height: window.outerHeight });

    $(document).on("click", ".find-a-game-button", function () {
        if (username.val().length > 0) {
            $("#find-game-form").submit();
        }
    });

    $(document).on("keydown, change, keyup", "#username", function () {
        if (username.val().length > 0) {
            $(".find-a-game-button").removeClass("disabled").addClass("btn-success");
        } else {
            $(".find-a-game-button").addClass("disabled").removeClass("btn-success");
        }
    });

    var zombieAttack = function (letter) {
        var num = Math.floor((Math.random() * 7) + 1);
        zombie = $(".zombie-" + num).removeClass("hit").removeClass("miss");
        zombie.children("span").html(letter);
        var left = Math.floor((Math.random() * (window.outerWidth - 800)) + 100);
        zombie.css({ left: left }).show();
    };

    var hitZombie = function () {
        zombie.addClass("hit").fadeOut(2000);
    };

    var missZombie = function () {
        zombie.addClass("miss").children("span").html("MISS");
        zombie.fadeOut(2000);
    };

    $('#pad').fancygestures(function (data) {
        $("#output").children("h1").html(data);
        socket.emit("playerAttack", { letter: data, turn: game.turn });

    });

    var createSocketConnection = function () {
        socket = io.connect(window.location.origin);

        socket.emit("ready");

        socket.on('zombieAttack', function (data) {
            game = data.game;
            $("#game-area").removeClass("waiting");
            $("#opponent").html(data.opponent);
            $(".home-url").attr("href", "/?username=" + data.you);

            if (data.hit === false) { //Opponent hit first...
                missZombie();
                setTimeout(function() {
                    zombieAttack(game.letter)
                }, 3000);
            } else if (data.hit === true) { //You hit first...
                hitZombie();
                setTimeout(function() {
                    zombieAttack(game.letter)
                }, 3000);
            } else { //First attack...
                $("#game-area").removeClass("directions");
                zombieAttack(game.letter);
            }

            $("#score").html(game.scores[data.you]);
            $("#opponent-score").html(game.scores[data.opponent]);
        });

        socket.on('opponentLeft', function (data) {
            socket.disconnect();
            $("#opponent-quit").modal();
        });

        socket.on('win', function (data) {
            $("#opponent-quit").remove();
            setTimeout(function() {
                socket.disconnect();
            }, 5000);
            $("#win").modal();
        });

        socket.on('lose', function (data) {
            $("#opponent-quit").remove();
            setTimeout(function() {
                socket.disconnect();
            }, 5000);
            $("#lose").modal();
        });
    };

    if ($("#game").length) {
        createSocketConnection();
    }
}());