// ==UserScript==
// @name		slither-friends
// @author		Christopher Sharman
// @namespace	https://slither-friends.csharman.co.uk
// @version		0.2.2
// @description Slither with friends!
// @downloadURL https://slither-friends.csharman.co.uk/client.user.js
// @updateURL	https://slither-friends.csharman.co.uk/client.user.js
// @require		https://slither-friends.csharman.co.uk/socket.io/socket.io.js
// @include		http://slither.io/
// @include		https://slither.io/
// @copyright	csharman.co.uk
// ==/UserScript==
(function() {

	/**
	 * An element to contain the list of servers and servers they are in.
	 * @type {Element}
	 */
	var serverList = createSlitherFriendsServerList();

	/**
	 * An element to contain the target pointers for other snakes.
	 * @type {Element}
	 */
	var directionReticule;

	/**
	 * The socket is used to communicate with the Slither Friends Master Server.
	 */
	var socket = openSocket();

	/**
	 * The result of the Snake existence check last tick.
	 * @type {boolean}
	 */
	var snakeExisted = false;

	/**
	 * The result of the Snake existence check this tick.
	 * @type {boolean}
	 */
	var snakeExists = false;

	/**
	 * Is the snake dead?
	 * @type {boolean}
	 */
	var snakeDead = false;

	/**
	 * The identifier for the snake given to it by slither.io.
	 * @type {null|number}
	 */
	var snakeId = null;

	/**
	 * The interval in milliseconds that we should report the snakes location.
	 * @type {number}
	 */
	var reportRefreshRate = 250;

	/**
	 * When we pass this time we need to update the Master Server.
	 * @type {number}
	 */
	var nextReportAfter = Date.now();

	/**
	 * The size of the arrow.
	 * @type {number}
	 */
	var directionArrowSize = 10;

	/**
	 * The diameter of the reticule.
	 * @type {number}
	 */
	var reticuleSize;

	/**
	 * Start the Slither Friends monitor.
	 */
	setInterval(slitherFriendsTick, 100);

	/**
	 * Add a resize event listener to adjust the reticule when the page size is changed.
	 */
	window.addEventListener('resize', slitherResize);

	/**
	 * Triggered when the Master Server sends the current player the list of other
	 * servers using Slither Friends and their positions.
	 * @param payload
	 */
	function playerLocations(payload) {

		if (!snakeExists) {
			return;
		}

		var arrowDistance = Math.round(reticuleSize / 2);

		// Clear the current reticule.
		directionReticule.innerHTML = '';

		// Populate the reticule.
		var myLocation = {x: snake.xx, y: snake.yy};

		for (var i in payload) {

			// Skip ourselves, that would be silly!
			if (i == snake.id) {
				continue;
			}

			var theirLocation = payload[i]['position'];

			// If we are close enough for the slither game server to tell us about near-by
			// snakes then we can use them to point more accurately and avoid positional
			// data delay caused by talking to and from the Slither Friends Master Server.
			// @TODO: Identify when snakes are close enough for us to know about them and
			// @TODO: constantly update arrow position to show a smooth directional indicator.
			for (var s in snakes) {
				if (snakes[s].id == payload[i].id) {
					// The player is near us, lets use the fresh positional data.
					theirLocation = {x: snakes[i].xx, y: snakes[i].yy};
					break;
				}
			}


			// Calculate the angles of snakes and positions for direction indicators.
			var angle = calculatePlayerDirectionAngle(myLocation, theirLocation);
			var x = arrowDistance * Math.cos(angle);
			var y = arrowDistance * Math.sin(angle);

			var playerDistance = calculatePlayerDistance(myLocation, theirLocation);

			// Create the triangle that points towards the other player.
			createPlayerDirectionTriangle(x, y, angle, payload[i], playerDistance);

		}

	}

	/**
	 * Create a direction arrow with player name that points towards other servers.
	 * @param x
	 * @param y
	 * @param angle
	 * @param payload
	 * @param distance
	 */
	function createPlayerDirectionTriangle(x, y, angle, payload, distance) {

		// The reticule is square, we don't need a separate width and height.
		var halfReticule = Math.round(reticuleSize / 2);

		var triangle = document.createElement('div');
		triangle.style.border = directionArrowSize + 'px solid transparent';
		triangle.style.borderBottom = directionArrowSize + 'px solid ' + payload['color'];
		triangle.style.background = 'transparent';
		triangle.style.position = 'absolute';
		triangle.style.color = payload['color'];
		triangle.style.width = '0';
		triangle.style.height = '0';
		triangle.style.transform = 'rotate(' + (angle + (Math.PI/2)) + 'rad)';

		// Position the triangle in the reticule.
		triangle.style.left = ((halfReticule + x) - directionArrowSize) + 'px';
		triangle.style.top = ((halfReticule + y) - directionArrowSize) + 'px';

		// Create a nameplate so we know who is in that direction.
		var nameplate = document.createElement('div');
		nameplate.innerHTML = payload['player'] + '(' + Math.round(distance) + ')';
		nameplate.style.float = 'left';
		nameplate.style.fontFamily = 'sans-serif';
		nameplate.style.fontSize = '12px';
		nameplate.style.transform = 'translate(-50%, 100%)';
		if (angle > 0 && angle < Math.PI) {
			nameplate.style.transform += ' rotate(180deg)';
		}
		// As a child of the triangle, the nameplate will already have the correct
		// position and rotation.
		triangle.appendChild(nameplate);

		directionReticule.appendChild(triangle);
	}

	/**
	 * Triggered when the Master Server sends a list of servers that are connected
	 * to the Master Server and are in the game. The current player must be at the
	 * main menu to get this event.
	 * @param payload
	 */
	function playersConnected(payload) {

		var currentIp = (typeof bso !== 'undefined' ? bso.ip + ':' + bso.po : 'None');

		var yourServer = document.createElement('div');
		yourServer.innerHTML = 'Your server: ' + currentIp;

		var newServerList = document.createElement('div');
		newServerList.appendChild(yourServer);

		for (var ip in payload) {

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

	/**
	 * Triggered very 100 milliseconds and keeps track of the game state.
	 * This method is also used to send frequent updates to the Master Server.
	 */
	function slitherFriendsTick() {

		snakeExists = (snake !== null);

		if (!snakeExisted && snakeExists) {
			// The snake has now been created and the player is playing.
			enteredGame();
		} else if (snakeExists && !snakeDead && snake.id !== snakeId) {
			// The snake.id changes to a negative number when it dies but before
			// the object can be made null.
			snakeDied();
		} else if (snakeExisted && !snakeExists) {
			// The snake has been removed from play, we are now on the main menu.
			leftGame();
		}

		// Update the Master Server with the snakes location.
		if (snakeExists && Date.now() > nextReportAfter) {
			nextReportAfter = Date.now() + reportRefreshRate;

			socket.emit('player-update', {
				position: {
					x: snake.xx,
					y: snake.yy
				}
			});
		}

		// Keep a track of the previous state so we can detect coming and going.
		snakeExisted = snakeExists;
	}

	/**
	 * Triggered when the player joins the game and starts controlling a snake.
	 */
	function enteredGame() {
		console.log('SLITHER FRIENDS:', 'SNAKE BORN');

		snakeId = snake.id;

		// Let the Slither Friends Master Server know that the player has started playing.
		socket.emit('started-playing', {
			server: bso.ip + ":" + bso.po,
			player: snake.nk,
			snakeId: snakeId,
			//snake.csw (lighter), snake.cs (standard), snake.cs04 (darker) are also usable.
			color: snake.csw,
			position: {
				x: snake.xx,
				y: snake.yy
			}
		});

		// Create the reticule.
		directionReticule = createDirectionReticule();
	}

	/**
	 * Triggered when the current player hits another snake and dies.
	 */
	function snakeDied() {
		console.log('SLITHER FRIENDS:', 'SNAKE DEAD');

		snakeDead = true;

		socket.emit('stopped-playing', snakeId);

		// Clear the reticule.
		var removeMe = document.getElementById('SlitherFriends-Reticule');
		removeMe.parentNode.removeChild(removeMe);
	}

	/**
	 * Triggered when the current player is shown the main menu.
	 */
	function leftGame() {
		console.log('SLITHER FRIENDS:', 'SNAKE LEFT');

		snakeDead = false;

	}

	/**
	 * Triggered when a Slither Friend on this server starts playing.
	 * @param player
	 */
	function playerJoined(player) {
		console.log('Player', player, 'has joined!');
	}

	/**
	 * Triggered when a Slither Friend on the server dies or disconnects.
	 * @param player
	 */
	function playerLeft(player) {
		console.log('Player', player, 'has left.');
	}

	/**
	 * Create an element to contain a list of servers and servers on them.
	 * @returns {Element}
	 */
	function createSlitherFriendsServerList() {

		var loginPage = document.getElementById('login');
		var serverList = document.createElement('div');
		serverList.style.position = 'absolute';
		serverList.style.top = '100px';
		serverList.style.left = '0';
		serverList.id = 'SlitherFriends-ServerList';
		serverList.style.fontFamily = 'sans-serif';
		serverList.style.fontSize = '12px';
		serverList.style.color = 'white';
		serverList.style.marginLeft = '10px';
		loginPage.appendChild(serverList);

		return serverList;

	}

	/**
	 * Get the reticule element that will contain the directional pointers.
	 * @returns {Element}
	 */
	function createDirectionReticule() {

		var reticule = document.createElement('div');
		reticule.id = 'SlitherFriends-Reticule';
		reticule.style.position = 'absolute';
		reticule.style.zIndex = '9999';
		reticule.style.background = 'rgba(0,0,0,.2)';
		reticule.style.borderRadius = '1000px';
		reticule.style.pointerEvents = 'none';
		positionReticule(reticule);
		document.body.appendChild(reticule);

		return reticule;

	}

	/**
	 * Position the reticule in the center of the screen.
	 * @param reticule
	 */
	function positionReticule(reticule) {

		var bodyWidth = document.body.clientWidth;
		var bodyHeight = document.body.clientHeight;

		// We want the outside of the reticule to be at about 20% way from the closest edge.
		reticuleSize = Math.round(Math.min(bodyWidth, bodyHeight) * 0.8);
		var reticulePosition = {
			x: Math.round((bodyWidth / 2) - (reticuleSize / 2)),
			y: Math.round((bodyHeight / 2) - (reticuleSize / 2))
		};

		reticule.style.width = reticuleSize;
		reticule.style.height = reticuleSize;
		reticule.style.left = reticulePosition.x;
		reticule.style.top = reticulePosition.y;
	}

	/**
	 * Fired when the page size is changed.
	 */
	function slitherResize() {

		if (snakeExists && !snakeDead) {
			positionReticule(directionReticule);
		}

	}

	/**
	 * Create a connection to the Slither Friends Master Server.
	 * @returns {*}
	 */
	function openSocket() {

		socket = io('https://slither-friends.csharman.co.uk');
		socket.on('player-joined', playerJoined);
		socket.on('player-left', playerLeft);
		socket.on('servers-connected', playersConnected);
		socket.on('player-locations', playerLocations);

		return socket;

	}

	/**
	 * Get the angle between two locations.
	 * @param p1 Point 1.
	 * @param p2 Point 2.
	 * @returns {number}
	 */
	function calculatePlayerDirectionAngle(p1, p2) {
		return Math.atan2((p2.y - p1.y), (p2.x - p1.x));
	}

	/**
	 * Get the distance between two points.
	 * @param p1 Point 1.
	 * @param p2 Point 2.
	 * @returns {number}
	 */
	function calculatePlayerDistance(p1, p2) {
		var x = p1.x - p2.x;
		var y = p1.y - p2.y;
		return Math.sqrt((x * x) + (y * y));
	}

})();
