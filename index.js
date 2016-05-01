var express = new require('express');
var app = express();
var http = new require('http').Server(app);
var io = new require('socket.io')(http);

app.use(express.static('public'));

//app.UseCors(CorsOptions.AllowAll);
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/pages/index.html');
});

var players = {};

setInterval(function() {

	for (var i in players) {
		if (!players.hasOwnProperty(i)) {
			continue;
		}
		console.log(i, players[i]['position']['x'], players[i]['position']['y']);
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
		console.log(this.custom.player, 'stopped playing on', this.custom.server, 'as socket', socket.id);
		this.leave(this.custom.server, null);
		io.sockets.in(this.custom.server).emit('player-left', this.custom.player);
		delete players[this.custom.server][this.custom.snakeId];
		socket.custom = {};
	});

	socket.on('player-update', function (params) {
		if (!(this.custom.snakeId in players)) {
			return;
		}
		players[this.custom.snakeId]['position'] = params['position'];
	});

	socket.on('disconnect', function () {
		console.log('---> disconnect (' + this.custom.player + ')');
		console.log(this.custom.player, 'disconnected as socket', socket.id);
		io.sockets.in(this.custom.server).emit('player-left', this.custom.player);
	});

});

http.listen(3000, function() {
	console.log('listening');
});
