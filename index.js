var express = new require('express');
var app = express();
var http = new require('http').Server(app);
var io = new require('socket.io')(http);

app.use(express.static('public'));

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/pages/index.html');
});

var servers = {};

var config = {
	printConnectedPlayers: true
};

if (config.printConnectedPlayers) {
	setInterval(displayConnectedPlayers, 5000);
}

function displayConnectedPlayers() {

	console.log('The currently connected players are:')
	for (var ip in servers) {
		console.log('> ' + ip);
		for (var snakeId in servers[ip]) {
			console.log(' > ' + servers[ip][snakeId]['player']);
		}
	}
}

setInterval(serverTick, 1000);

function serverTick() {

	// Send a list of servers and the players on them to people on the main menu.
	// Also send a list of player positions to other players on the same server.
	sendPlayerData();

}

/**
 * Send snake position data to all other snakes in the same server.
 * Send a list of servers and players connected to them to players on the main menu.
 */
function sendPlayerData() {

	var playersConnected = {};

	for (var ip in servers) {

		if (!(ip in playersConnected)) {
			playersConnected[ip] = [];
		}

		for (var snakeId in servers[ip]) {
			var player = servers[ip][snakeId];
			playersConnected[ip].push(player['player']);
		}

		// Send connected servers to the connected servers.
		io.sockets.in(ip).emit('player-locations', servers[ip]);
	}

	// For servers on the main menu we want to show what servers servers are in.
	io.sockets.in('main-menu').emit('servers-connected', playersConnected);

}

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

		if (!(server in servers)) {
			servers[server] = {};
		}

		servers[server][snakeId] = {
			player: player,
			snakeId: snakeId,
			color: params['color'],
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

		delete servers[socket.custom.server][socket.custom.snakeId];
		if (Object.keys(servers[socket.custom.server]).length === 0) {
			delete servers[socket.custom.server];
		}

		socket.custom.snakeId = null;
	});

	socket.on('player-update', function (params) {
		if (!(this.custom.snakeId in servers)) {
			return;
		}
		servers[socket.custom.snakeId]['position'] = params['position'];
	});

	socket.on('disconnect', function () {
		console.log('---> disconnect (' + socket.id + ')');

		// If the player is not playing as a snake then we don't need to do
		// cleanup and let clients know they've left.
		if (socket.custom.snakeId !== null) {
			io.sockets.in(socket.custom.server).emit('player-left', socket.custom.player);
			delete servers[socket.custom.server][socket.custom.snakeId];
			if (Object.keys(servers[socket.custom.server]).length === 0) {
				delete servers[socket.custom.server];
			}
		}
	});

});

http.listen(3000, function() {
	console.log('listening');
});
