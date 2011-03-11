var node = { };
node.http = require("http");
node.url = require("url");
node.querystring = require("querystring");

var ip = process.argv[2];
var port = process.argv[3];

var rooms = { };
var getCommands = { };
var postCommands = { };

function ago(time) {
	var now = new Date();
	var then = new Date(Number(time));
	var dt = now.getTime() - then.getTime();
	var word = dt > 0 ? "ago" : "from now";
	dt = Math.abs(dt);
	if( dt < 1000 * 60 ) {
		return String((dt / 1000).toFixed(0)) + " seconds " + word;
	} else if( dt < 1000 * 60 * 60 ) {
		return String((dt / (60 * 1000)).toFixed(0)) + " minutes " + word;
	} else if( dt < 1000 * 60 * 60 * 24 ) {
		return String((dt / (60 * 60 * 1000)).toFixed(0)) + " hours " + word;
	}
	return String((dt / (24 * 60 * 60 * 1000)).toFixed(0)) + " days " + word;
};


getCommands["/v1/messages.json"] = getCommands["/v1/messages.jsonp"] = function(url, request, response, callback) {
	if( url.pathname.indexOf("jsonp") !== -1 && !url.query.hasOwnProperty("callback") ) { 
		callback("expected param callback.");
	}
	if( !url.query.hasOwnProperty("room") ) {
		callback("expected param room.");
	}
	var answer = { messages: [ ] };
	response.writeHead(200, {"Content-Type": "application/json"});
	if( rooms.hasOwnProperty(url.query.room) ) {
		var since;
		if( url.query.hasOwnProperty("since") ) {
			since = Number(url.query.since);
		} else {
			since = (new Date()).getTime() - 24 * 60 * 60 * 2;
		}
		var now = (new Date()).getTime();
		var messages = rooms[url.query.room];
		for( var i = 0; i < messages.length; i++ ) { 
			var message = messages[i];
		//	if( message.timestamp > since ) {
				message.ago = ago(message.timestamp);
				answer.messages.push(message);
		//	}	
		}
	}
	if( url.pathname.indexOf("jsonp") !== -1 ) {
		response.end(url.query.callback + "(" + JSON.stringify(answer) + ");");
	} else {
		response.end(JSON.stringify(answer));
	}
	callback(undefined);
};

getCommands["/robots.txt"] = function(url, request, response, callback) {
	response.writeHead(200, {"Content-Type": "text/plain"});
	response.end("User-agent: *\nDisallow: /\n");
	callback(undefined);
};

postCommands["/v1/messages.json"] = function(url, request, response, callback) {
	var payload = "";
	request.addListener("data", function(chunk) {
		payload = payload + chunk;
	});
	request.addListener("end", function() {
		var question;
		try {
			question = JSON.parse(payload);
		} catch(error) {
			callback("invalid json.");
			return;
		}
		if( !question.hasOwnProperty("room") ) {
			callback("expected JSON property room.");
		}
                if( !question.hasOwnProperty("body") ) {
                        callback("expected JSON property body.");
                }
		var messages;
		if( rooms.hasOwnProperty(question.room) ) {
			messages = rooms[question.room];
		} else {
			messages = rooms[question.room] = [ ];
		}
		messages.push({ timestamp: (new Date()).getTime(), username: question.username, body: question.body });
		response.writeHead(200);
		response.end();
		callback(undefined);
	});
};

var httpServer = node.http.createServer(function(request, response) {
	request.connection.removeAllListeners("error");
	request.connection.on("error", function(error) {
	});
	var url = node.url.parse(request.url, true);
	if( typeof(url.pathname) !== "string" ) {
		url.pathname = "/";
	}
	var endpoint = node.querystring.unescape(url.pathname)
	var authentication = request.headers["authentication"];
	if( request.method === "GET" ) {
		if( getCommands.hasOwnProperty(endpoint) ) {
			getCommands[endpoint](url, request, response, function(error) {
				if( error ) {
					response.writeHead(500, {"Content-Type" : "application/javascript"});
					response.end(JSON.stringify({ error: error}));
				}
			});
		} else {
			response.writeHead(404);
			response.end();
		}
	} else if( request.method === "POST" ) {
                if( postCommands.hasOwnProperty(endpoint) ) {
                        postCommands[endpoint](url, request, response, function(error) {
                                if( error ) {
                                        response.writeHead(500, {"Content-Type" : "application/javascript"});
					response.end(JSON.stringify({error: error}));
                                }
                        });
                } else {
                        response.writeHead(404);
                        response.end();
                }
	} else {
		response.writeHead(404);
		response.end();
	}
});

httpServer.listen(port, ip);
console.log("Server started on " + ip + ":" + port + ".");

