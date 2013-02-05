///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Libraries, dependencies
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var express = require("express"),
    http = require("http"),
    socketIO = require('socket.io'),
    connect = require("connect"),
    swig = require('./config/consolidate-swig').swig,
    swigLib = require('swig');

var redisClient;
if (process.env.REDISTOGO_URL) {
    var rtg   = require("url").parse(process.env.REDISTOGO_URL);
    redisClient = require("redis").createClient(rtg.port, rtg.hostname);
    redisClient.auth(rtg.auth.split(":")[1]);
} else {
    var redis = require("redis").createClient();
    redisClient = redis.createClient();
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Routes Handlers
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var swipeRoute = require("./routes/routes.js");

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// App Configuration
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var app = module.exports = express();
var server = http.createServer(app);
var io = socketIO.listen(server);
var sessionSecret = "random session secret";
var sessionKey = "sid";
var sessionStore = new connect.session.MemoryStore();


redisClient.on("error", function (err) {
    console.log("Error " + err);
});

io.configure(function () {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 10);

    //io.set('transports', [ 'websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling' ]);

    io.set('authorization', function (data, accept) {
        if (!data.headers.cookie) {
            return accept('Session cookie required.', false);
        }
        data.cookie = require("cookie").parse(data.headers.cookie);
        data.sessionID = connect.utils.parseSignedCookie(data.cookie[sessionKey], sessionSecret);
        sessionStore.get(data.sessionID, function (err, session) {
            if (err) {
                return accept('Error in session store.', false);
            } else if (!session) {
                return accept('Session not found.', false);
            }
            data.session = session;
            return accept(null, true);
        });
    });
});

swigLib.init({
    root: __dirname + "/views",
    cache: false,
    allowErrors: true,
    filters: {}
});

app.configure(function() {
	app.set('port', process.env.PORT || 3000);
    app.enable("case sensitive routes");
    app.enable("strict routing");
    app.use(express.bodyParser());
    app.use(express.cookieParser(sessionSecret));
    app.use(express.session({ key: sessionKey, store: sessionStore }));
    app.use(app.router);
    app.use(express.static(__dirname + "/public"));
    app.engine('html', swig);
    app.set("view engine", "html");
    app.set("views", __dirname + "/views");
    app.set("view options", { layout: false });
  	app.use(express.favicon());
});

// Error handling configuration for development environments.
app.configure("development", function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// Error handling configuration for production environments.
app.configure("production", function() {
    app.use(express.errorHandler());
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Socket IO
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var onlineUsers = [];
var alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

io.sockets.on('connection', function (socket) {
    var hs = socket.handshake;

    socket.on('disconnect', function () {
        //Remove from possible opponents...
        if (onlineUsers.length >= 1) {
            for (var i in onlineUsers) {
                if (onlineUsers[i] === socket.id) {
                    onlineUsers.splice(i, 1);
                }
            }
        }

        //Remove game if exists, notify opponent of end of game...
        var gameID = hs.session.gameID;
        redisClient.get("GAME_" + gameID, function (err, rawData) {
            var game = JSON.parse(rawData);
            if (!err) {
                if (game !== null && game.players[hs.session.username] === socket.id) {
                    redisClient.del("GAME_" + game.id); //Delete the game object...
                    var opponent = null;
                    var opponentSocket = null;
                    for (var name in game.players) {
                        if (name !== hs.session.username) {
                            opponent = name;
                            opponentSocket = io.sockets.socket(game.players[name]);
                        }
                    }
                    //Notify opponent...
                    opponentSocket.emit('opponentLeft', { opponent: hs.session.username, you: opponent });
                }
            }
        });
    });

    function generateUUID(){
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d/16);
            return (c == 'x' ? r : (r&0x7|0x8)).toString(16);
        });
        return uuid;
    };

    socket.on('ready', function () {
        if (onlineUsers.length === 0) { // If no-one is waiting...
            onlineUsers.push({ socketID: socket.id, username: hs.session.username });
        } else if (onlineUsers.length === 1 && onlineUsers[0] !== undefined && onlineUsers[0].username !== hs.session.username) { //If there is one person and its not you.
            var opponent = onlineUsers[0].username;
            var opponentSocket = io.sockets.socket(onlineUsers[0].socketID);
            var opponentHs = opponentSocket.handshake;
            onlineUsers.splice(0, 1); //Remove the matched player.

            //Our simple game object.
            var game = {
                id: 1,
                turn: 1,
                letter: alphabet[Math.floor((Math.random() * 26))],
                scores: {},
                players: {}
            };
            game.scores[opponent] = 0;
            game.scores[hs.session.username] = 0;
            game.players[opponent] = opponentSocket.id;
            game.players[hs.session.username] = socket.id;

            //Save our game to redis store...
            redisClient.set("GAME_" + game.id, JSON.stringify(game));
            redisClient.expire("GAME_" + game.id, 3600); //Auto expire game object in one hour from redis.

            //Save the game ID to the users session object, for later reference...
            opponentHs.session.gameID = game.id;
            hs.session.gameID = game.id;

            //Delay actual game start for a few seconds so its not so abrupt...
            setTimeout(function () {
                //Emit a message to both players for a zombie attack!
                socket.emit('zombieAttack', { game: game, opponent: opponent, you: hs.session.username });
                opponentSocket.emit('zombieAttack', { game: game, opponent: hs.session.username, you: opponent });
            }, 3000);
        } else if (onlineUsers.length === 1 && onlineUsers[0] !== undefined && onlineUsers[0].username === hs.session.username) { //If there is one person and it is you, update socket id.
            onlineUsers[0].socketID = socket.id;
        }
    });

    socket.on('playerAttack', function(incomingData) {
        var gameID = hs.session.gameID;
        redisClient.get("GAME_" + gameID, function (err, rawData) {
            var game = JSON.parse(rawData);
            if (!err) {
                if (game.players[hs.session.username] === socket.id) { //Ensure the game actually has this player...
                    if (incomingData.turn === game.turn && incomingData.letter === game.letter) { //Ensure we have the right turn and letter...
                        //Modify the game and update it in Redis.
                        game.turn = Math.min(10, game.turn + 1);
                        game.letter = alphabet[Math.floor((Math.random() * 26))];
                        game.scores[hs.session.username] = game.scores[hs.session.username] + 1;
                        redisClient.set("GAME_" + game.id, JSON.stringify(game));
                        redisClient.expire("GAME_" + game.id, 3600);

                        var opponent = null;
                        var opponentSocket = null;
                        for (var name in game.players) {
                            if (name !== hs.session.username) {
                                opponent = name;
                                opponentSocket = io.sockets.socket(game.players[name]);
                            }
                        }

                        if (game.turn >= 10) {
                            if (game.scores[hs.session.username] > game.scores[opponent]) {
                                socket.emit('win', { game: game, opponent: opponent, you: hs.session.username });
                                opponentSocket.emit('lose', { game: game, opponent: hs.session.username, you: opponent });
                            } else {
                                socket.emit('lose', { game: game, opponent: opponent, you: hs.session.username });
                                opponentSocket.emit('win', { game: game, opponent: hs.session.username, you: opponent });
                            }
                        } else {
                            socket.emit('zombieAttack', { game: game, hit: true, opponent: opponent, you: hs.session.username });
                            opponentSocket.emit('zombieAttack', { game: game, hit: false, opponent: hs.session.username, you: opponent });
                        }
                    }
                }
            }
        });
    });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Routes
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/", swipeRoute.index);
app.all("/game", swipeRoute.findGame);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Server
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
server.listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});