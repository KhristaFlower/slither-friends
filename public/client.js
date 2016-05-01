(function() {

	var socket = io('https://slither-friends.csharman.co.uk');

	socket.on('player-joined', playerJoined);
	socket.on('player-left', playerLeft);

	setInterval(checkSnake, 100);
	setInterval(reportLocation, 1000);

	var snakeExists = false;
	var snakeName = null;
	var snakeId = null;

	function reportLocation() {

		if (!snakeExists) {
			return;
		}

		socket.emit('player-update', {
			player: snakeName,
			snakeId: snake.id,
			position: {
				x: snake.xx,
				y: snake.yy
			}
		});

	}

	function checkSnake() {
		if (!snakeExists && typeof snake === 'object') {

			snakeExists = true;
			snakeId = snake.id;
			snakeName = snake.nk;

			socket.emit('started-playing', {
				player: snakeName,
				snakeId: snakeId,
				position: {
					x: snake.xx,
					y: snake.yy
				}
			});
		}
		if (snakeExists && typeof snake === 'undefined') {
			socket.emit('stopped-playing', {
				player: snakeName,
				snakeId: snakeId
			});
			snakeExists = false;
			snakeName = null;
		}
	}

	function playSlither() {
		var player = document.getElementById('username').value;

		socket.emit('started-playing', {
			player: player,
			server: currServ
		});
	}

	function playerJoined(player) {
		console.log('Player', player, 'has joined!');
	}

	function playerLeft(player) {
		console.log('Player', player, 'has left.');
	}

})();
