// ==UserScript==
// @name		slither-friends
// @author		Christopher Sharman
// @namespace	https://slither-friends.csharman.co.uk
// @version		0.0.4
// @description Slither with friends!
// @downloadURL https://slither-friends.csharman.co.uk/client.user.js
// @updateURL	https://slither-friends.csharman.co.uk/client.user.js
// @require		https://slither-friends.csharman.co.uk/socket.io/socket.io.js
// @include		http://slither.io/
// @include		https://slither.io/
// @copyright	csharman.co.uk
// ==/UserScript==
(function() {

	var socket = io('https://slither-friends.csharman.co.uk');

	socket.on('player-joined', playerJoined);
	socket.on('player-left', playerLeft);

	setInterval(checkSnake, 100);

	var snakeExists = false;
	var snakeName = null;
	var snakeId = null;
	var snakeReporter = null;
	var server = null;

	function reportLocation() {

		if (!snakeExists) {
			return;
		}

		socket.emit('player-update', {
			position: {
				x: snake.xx,
				y: snake.yy
			}
		});

	}

	function checkSnake() {
		if (!snakeExists && snake !== null) {
			console.log("SLITHER FRIENDS: Snake Born!");

			snakeExists = true;
			snakeId = snake.id;
			snakeName = snake.nk;
			server = bso.ip + ":" + bso.po;

			socket.emit('started-playing', {
				server: server,
				player: snakeName,
				snakeId: snakeId,
				position: {
					x: snake.xx,
					y: snake.yy
				}
			});

			setTimeout(function() {
				// Hold off sending details for a moment.
				snakeReporter = setInterval(reportLocation, 1000);
			}, 1000);

		}
		if (snakeExists && snake === null) {
			console.log("SLITHER FRIENDS: Snake Dead :(");

			clearTimeout(snakeReporter);

			socket.emit('stopped-playing', {
				player: snakeName,
				snakeId: snakeId
			});
			snakeExists = false;
			snakeName = null;
		}
	}

	function playerJoined(player) {
		console.log('Player', player, 'has joined!');
	}

	function playerLeft(player) {
		console.log('Player', player, 'has left.');
	}

})();
