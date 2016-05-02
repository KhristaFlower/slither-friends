var express = new require('express');
var app = express();
var http = new require('http').Server(app);
var io = new require('socket.io')(http);

app.use(express.static('public'));

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/pages/index.html');
});

var players = {};

setInterval(function() {

	var servers = players;

	for (var ip in servers) {
		if (!servers.hasOwnProperty(ip)) {
			continue;
		}

		console.log('');
		console.log('Players connected to', ip);

		var server = servers[ip];
		for (var snakeId in server) {
			if (!server.hasOwnProperty(snakeId)) {
				continue;
			}

			var player = server[snakeId];
			console.log(player['player']);
		}
	}

}, 5000);

io.on('connection', function (socket) {
	console.log('---> connection', socket.id);

	socket.custom = {
		player: null,
		server: null,
		snakeId: null
	};

	socket.on('started-playing', function (params) {
		var player = params['player'];
		var server = params['server'];
		var snakeId = params['snakeId'];

		console.log('---> started-playing (' + player + ')');

		if (!(server in players)) {
			players[server] = {};
		}

		players[server][snakeId] = {
			player: player,
			snakeId: snakeId,
			position: params['position']
		};

		console.log(player, 'started playing on', server, 'as socket', socket.id)

		io.sockets.in(server).emit('player-joined', player);
		this.join(server);

		socket.custom = {
			player: player,
			server: server,
			snakeId: snakeId
		};
	});

	socket.on('stopped-playing', function () {
		console.log(socket.custom.player, 'stopped playing on', socket.custom.server, 'as socket', socket.id);
		this.leave(socket.custom.server, null);
		io.sockets.in(socket.custom.server).emit('player-left', socket.custom.player);
		delete players[socket.custom.server][socket.custom.snakeId];
		if (Object.keys(players[socket.custom.server]).length === 0) {
			delete players[socket.custom.server];
		}
		socket.custom = {};
	});

	socket.on('player-update', function (params) {
		if (!(this.custom.snakeId in players)) {
			return;
		}
		players[socket.custom.snakeId]['position'] = params['position'];
	});

	socket.on('disconnect', function () {
		console.log('---> disconnect (' + this.custom.player + ')');
		console.log(socket.custom.player, 'disconnected as socket', socket.id);
		io.sockets.in(socket.custom.server).emit('player-left', socket.custom.player);
		delete players[socket.custom.server][socket.custom.snakeId];
		if (Object.keys(players[socket.custom.server]).length === 0) {
			delete players[socket.custom.server];
		}
	});

});

http.listen(3000, function() {
	console.log('listening');
});
