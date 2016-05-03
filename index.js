var express = new require('express');
var app = express();
var http = new require('http').Server(app);
var io = new require('socket.io')(http);

app.use(express.static('public'));

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/pages/index.html');
});

var players = {};

var config = {
	printConnectedPlayers: true
};

setInterval(function() {


	var servers = players;
	var playerCount = 0;

	if (config.printConnectedPlayers) {

		var date = new Date();
		var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
		var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
		var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();

		console.log('CONNECTED PLAYERS @ ' + hours + ':' + minutes + ':' + seconds);
	}

	var playersConnected = {};

	for (var ip in servers) {
		if (!servers.hasOwnProperty(ip)) {
			continue;
		}

		if (!(ip in playersConnected)) {
			playersConnected[ip] = [];
		}

		if (config.printConnectedPlayers) {
			console.log('');
			console.log('> ', ip);
		}

		var server = servers[ip];

		if (config.printConnectedPlayers) {
			for (var snakeId in server) {
				if (!server.hasOwnProperty(snakeId)) {
					continue;
				}

				var player = server[snakeId];
				playersConnected[ip].push(player['player']);
				console.log('    >', player['player']);
				playerCount++;
			}
		}

		// Send connected players to the connected players.
		io.sockets.in(ip).emit('player-locations', server);
	}

	if (config.printConnectedPlayers) {
		console.log(playerCount === 0 ? 'None!' : playerCount + ' players!');
	}

	// For players on the main menu we want to show what servers players are in.
	io.sockets.in('main-menu').emit('players-connected', playersConnected);

}, 1000);

io.on('connection', function (socket) {
	console.log('---> connection', socket.id);

	socket.join('main-menu');

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

		this.leave('main-menu', null);
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
		this.join('main-menu');

		io.sockets.in(socket.custom.server).emit('player-left', socket.custom.player);

		delete players[socket.custom.server][socket.custom.snakeId];
		if (Object.keys(players[socket.custom.server]).length === 0) {
			delete players[socket.custom.server];
		}

		socket.custom.snakeId = null;
	});

	socket.on('player-update', function (params) {
		if (!(this.custom.snakeId in players)) {
			return;
		}
		players[socket.custom.snakeId]['position'] = params['position'];
	});

	socket.on('disconnect', function () {
		console.log('---> disconnect (' + socket.id + ')');

		// If the player is not playing as a snake then we don't need to do
		// cleanup and let clients know they've left.
		if (socket.custom.snakeId !== null) {
			io.sockets.in(socket.custom.server).emit('player-left', socket.custom.player);
			delete players[socket.custom.server][socket.custom.snakeId];
			if (Object.keys(players[socket.custom.server]).length === 0) {
				delete players[socket.custom.server];
			}
		}
	});

});

http.listen(3000, function() {
	console.log('listening');
});
