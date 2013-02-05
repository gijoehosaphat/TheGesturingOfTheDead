exports.index = function(request, response) {
    response.render("index", {  });
};

exports.findGame = function(request, response) {
    var username = request.param("username");

    if (username !== null && username != "") {
    	request.session.username = username;
        response.render("game", {  });
    } else {
        response.render("index", { error: "You need to enter a username to play!" });
    }
};