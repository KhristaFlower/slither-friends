// ==UserScript==
// @name		slither-friends
// @author		Christopher Sharman
// @namespace	https://slither-friends.csharman.co.uk
// @version		0.0.5
// @description Slither with friends!
// @downloadURL https://slither-friends.csharman.co.uk/client.user.js
// @updateURL	https://slither-friends.csharman.co.uk/client.user.js
// @require		https://slither-friends.csharman.co.uk/socket.io/socket.io.js
// @include		http://slither.io/
// @include		https://slither.io/
// @copyright	csharman.co.uk
// ==/UserScript==
(function() {

	var loginPage = document.getElementById('login');
	var serverList = document.createElement('div');
	serverList.style.position = 'absolute';
	serverList.style.top = '50%;';
	serverList.style.left = '0';
	serverList.id = 'SlitherFriends-ServerList';
	serverList.style.fontFamily = 'sans-serif';
	serverList.style.color = 'white';
	serverList.style.marginLeft = '10px';
	loginPage.appendChild(serverList);

	var socket = io('https://slither-friends.csharman.co.uk');

	socket.on('player-joined', playerJoined);
	socket.on('player-left', playerLeft);
	socket.on('players-connected', playersConnected);
	socket.on('player-locations', playerLocations);

	setInterval(checkSnake, 100);

	var snakeExists = false;
	var snakeName = null;
	var snakeId = null;
	var snakeReporter = null;
	var server = null;

	function playerLocations(payload) {
		console.log(payload);
	}

	function playersConnected(payload) {
		var currentIp = (typeof bso !== 'undefined' ? bso.ip + ':' + bso.po : 'None');

		var newServerList = document.createElement('div');
		var yourServer = document.createElement('div');
		yourServer.innerHTML = 'Your server: ' + currentIp;
		newServerList.appendChild(yourServer);
		for (var ip in payload) {
			if (!payload.hasOwnProperty(ip)) {
				continue;
			}
			var serverName = document.createElement('div');
			var serverJoinLink = document.createElement('a');
			var ipAndPort = ip.split(':');
			serverName.style.marginTop = '10px';
			serverJoinLink.style.color = (ip === currentIp ? 'lime' : 'white');
			serverJoinLink.innerHTML = ip;
			serverJoinLink.href = 'javascript:forceServer(\'' + ipAndPort[0] + '\',' + ipAndPort[1] + ')';
			serverName.appendChild(serverJoinLink);
			newServerList.appendChild(serverName);
			for (var player in payload[ip]) {
				var playerName = document.createElement('div');
				playerName.innerHTML = payload[ip][player];
				playerName.style.marginLeft = '10px';
				newServerList.appendChild(playerName);
			}
		}

		serverList.innerHTML = '';
		serverList.appendChild(newServerList);
	}

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
