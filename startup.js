var http = require("http");

var httpServer = http.createServer(function(req, res) {
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end("Hello World\n");
});

var ip = process.argv[2];
var port = process.argv[3];

httpServer.listen(port, ip);
console.log("Server started on " + ip + ":" + port + ".");
