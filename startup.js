var http = require("http");
var url = require("url");
var querystring = require("querystring");

var ip = process.argv[2];
var port = process.argv[3];

var rooms = { };
var getCommands = { };
var postCommands = { };

getCommands["/v1/messages.jsonp"] = function(params, request, response, callback) {
	if( !params.hasOwnProperty("callback") ) { 
		callback("expected param callback.");
	}
	if( !params.hasOwnProperty("room") ) {
		callback("expected param room.");
	}
	var answer = { messages: [ ] };
	response.writeHead(200, {"Content-Type": "application/json"});
	if( rooms.hasOwnProperty(params.room) ) {
		var since;
		if( params.hasOwnProperty("since") ) {
			since = Number(params.since);
		} else {
			since = (new Date()).getTime() - 24 * 60 * 60 * 2;
		}
		var messages = rooms[params.room];
		for( var i = 0; i < messages.length; i++ ) { 
			var message = messages[i];
			if( message.timestamp > since ) {
				answer.messages.push(message);
			}	
		}
	}
	response.end(params.callback + "(" + JSON.stringify(answer) + ");");
	callback(undefined);
};

getCommands["/robots.txt"] = function(params, request, response, callback) {
	response.writeHead(200, {"Content-Type": "text/plain"});
	response.end("User-agent: *\nDisallow: /\n");
	callback(undefined);
};

postCommands["/v1/message.jsonp"] = function(params, request, response, callback) {
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

var httpServer = http.createServer(function(request, response) {
	request.connection.removeAllListeners("error");
	request.connection.on("error", function(error) {
	});
	var parsedUrl = url.parse(request.url, true);
	if( typeof(parsedUrl.pathname) !== "string" ) {
		parsedUrl.pathname = "/";
	}
	var endpoint = querystring.unescape(parsedUrl.pathname)
	var authentication = request.headers["authentication"];
	if( request.method === "GET" ) {
		if( getCommands.hasOwnProperty(endpoint) ) {
			getCommands[endpoint](parsedUrl.query, request, response, function(error) {
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
                        postCommands[endpoint](parsedUrl.query, request, response, function(error) {
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

