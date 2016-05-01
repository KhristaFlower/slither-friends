var express = new require('express');
var app = express();
var http = new require('http').Server(app);
var io = new require('socket.io')(http);

app.use(express.static('public'));

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/pages/index.html');
});

var players;

io.on('connection', function (socket) {
	console.log('---> connection', socket.id);

	var player = null;
	var server = null;
	var snakeId = null;

	socket.on('started-playing', function (params) {
		console.log('---> started-playing', params);
		player = params['player'];
		server = params['server'];
		snakeId = params['snakeId'];
		players[server][snakeId] = {
			player: player,
			snakeId: snakeId,
			position: params['position']
		};

		console.log(player, 'started playing on', server, 'as socket', socket.id)

		io.sockets.in(server).emit('player-joined', player);
		this.join(server);
	});

	socket.on('stopped-playing', function () {
		console.log('---> stopped-playing');
		console.log(player, 'stopped playing on', server, 'as socket', socket.id);
		this.leave(server, null);
		io.sockets.in(server).emit('player-left', player);
		delete players[server][snakeId];
		player = null;
		server = null;
		snakeId = null;
	});

	socket.on('player-update', function (params) {
		console.log('---> player-update', params);
		players[snakeId]['position'] = params['position'];
	});

	socket.on('disconnect', function () {
		console.log('---> disconnect')
		console.log(player, 'disconnected as socket', socket.id);
		io.sockets.in(server).emit('player-left', player);
	});

});

http.listen(3000, function() {
	console.log('listening');
});
