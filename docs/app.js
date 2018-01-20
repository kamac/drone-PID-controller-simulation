webpackJsonp([0],{

/***/ 174:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.simulation = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _matterJs = __webpack_require__(90);

var _matterJs2 = _interopRequireDefault(_matterJs);

var _charts = __webpack_require__(176);

var _charts2 = _interopRequireDefault(_charts);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Engine = _matterJs2.default.Engine,
    Render = _matterJs2.default.Render,
    World = _matterJs2.default.World,
    Body = _matterJs2.default.Body,
    Events = _matterJs2.default.Events,
    Vector = _matterJs2.default.Vector,
    Mouse = _matterJs2.default.Mouse,
    MouseConstraint = _matterJs2.default.MouseConstraint,
    Bodies = _matterJs2.default.Bodies;

var PIDController = function () {
	function PIDController(targetValue, errorScale, Kp, Ki, Kd) {
		_classCallCheck(this, PIDController);

		this.targetValue = targetValue;
		this.Kp = Kp;
		this.Ki = Ki;
		this.Kd = Kd;
		this.errorScale = errorScale;

		this._previousError = 0;
		this._integral = 0;
	}

	_createClass(PIDController, [{
		key: "calculateError",
		value: function calculateError(currentValue) {
			return this.targetValue - currentValue;
		}
	}, {
		key: "calculateOutput",
		value: function calculateOutput(currentValue) {
			var error = this.calculateError(currentValue) / this.errorScale;
			this._integral += error;
			var derivative = error - this._previousError;
			var output = this.Kp * error + this.Ki * this._integral + this.Kd * derivative;
			this._previousError = error;
			return output;
		}
	}, {
		key: "lastError",
		get: function get() {
			return this._previousError;
		}
	}]);

	return PIDController;
}();

var Drone = function () {
	function Drone(x, y) {
		_classCallCheck(this, Drone);

		this._width = 80;
		this._height = 20;
		this.body = Bodies.rectangle(x, y, this._width, this._height);

		// regulator wysokości (regulator PID) błąd przeskalowany, żeby przy 200 unitach różnicy wysokości użyć
		// maksymalnej mocy silnika
		this.heightController = new PIDController(300, 200 / 0.0025, 1, 0.003, 1);
		// regulator kąta nachylenia do podłoża (regulator PD)
		this.angularController = new PIDController(0, 10, 1, 0.01, 0.5);
	}

	_createClass(Drone, [{
		key: "update",
		value: function update() {
			var heightForce = this.heightController.calculateOutput(this.body.position.y);
			// heightForce ograniczona do ustalonych wartości żeby symulować silniki drona
			// jeśli chcemy iść w dół, wyłączamy silniki
			// jeśli chcemy iść w górę, nie możemy tego zrobić z siłą większą niż 0.0025 prostopadłą do drona
			heightForce = Math.min(Math.max(heightForce, -0.0025), 0);

			var forceX = heightForce * Math.cos(this.body.angle + Math.PI / 2);
			var forceY = heightForce * Math.sin(this.body.angle + Math.PI / 2);
			this.body.force = Vector.create(forceX, forceY);

			if (this.angularController) {
				this.body.torque = this.angularController.calculateOutput(this.body.angle);
			}
		}
	}]);

	return Drone;
}();

var Simulation = function () {
	function Simulation() {
		_classCallCheck(this, Simulation);

		this.lastUpdate = 0;
	}

	_createClass(Simulation, [{
		key: "init",
		value: function init() {
			var _this = this;

			// create an engine
			this.engine = Engine.create();

			// create a renderer
			this.render = Render.create({
				element: document.getElementById("simulation"),
				engine: this.engine,
				options: {
					width: 600,
					height: 600,
					showSleeping: false,
					showVelocity: true,
					showCollisions: true
				}
			});

			// create two boxes and a ground
			this.drone = new Drone(300, 610 - 20);
			//this.recorder = new Recorder(() => this.drone.heightController.lastError, 50, 1100);
			//this.recorderForce = new Recorder(() => -this.drone.body.force.y, 50, 1100, 'svg#chart-force', 'chartForce.png');
			var bbLeft = Bodies.rectangle(0, 300, 60, 810, { isStatic: true });
			var bbRight = Bodies.rectangle(600, 300, 60, 810, { isStatic: true });
			var bbBottom = Bodies.rectangle(400, 610, 810, 60, { isStatic: true });
			var bbTop = Bodies.rectangle(400, 0, 810, 60, { isStatic: true });
			var circle = Bodies.circle(100, 500, 20);
			var circle2 = Bodies.circle(125, 500, 10);
			var circle3 = Bodies.circle(140, 500, 5);

			// add all of the bodies to the world
			World.add(this.engine.world, [this.drone.body, bbLeft, bbRight, bbTop, bbBottom, circle, circle2, circle3]);

			// add mouse control
			var mouse = Mouse.create(this.render.canvas),
			    mouseConstraint = MouseConstraint.create(this.engine, {
				mouse: mouse,
				constraint: {
					stiffness: 0.2,
					render: {
						visible: false
					}
				}
			});
			World.add(this.engine.world, mouseConstraint);
			this.render.mouse = mouse;

			// run the engine
			Engine.run(this.engine);
			// run the renderer
			Render.run(this.render);

			Events.on(this.engine, 'afterUpdate', function (e) {
				return _this._afterUpdate(e);
			});
		}
	}, {
		key: "_afterUpdate",
		value: function _afterUpdate(event) {
			var deltaTime = event.timestamp - this.lastUpdate;

			this.drone.update();
			/*this.recorder.update(event.timestamp);
   this.recorderForce.update(event.timestamp);
   		if(this.recorder.values.length == this.recorder.numPoints-400) {
   	World.add(this.engine.world, Bodies.circle(this.drone.body.position.x, this.drone.body.position.y - 100, 15));
   }*/

			this.lastUpdate = event.timestamp;
		}
	}]);

	return Simulation;
}();

var simulation = exports.simulation = new Simulation();

window.onload = function () {
	simulation.init();
};

/***/ }),

/***/ 176:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _d = __webpack_require__(91);

var d3 = _interopRequireWildcard(_d);

var _saveSvgAsPng = __webpack_require__(173);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Recorder = function () {
	/*
 Record a value over time and display it on a line chart
 */

	function Recorder(getValueCallback, recordInterval, numPoints) {
		var selector = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'svg.chart';
		var filename = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'chart.png';

		_classCallCheck(this, Recorder);

		this.values = [];
		this.filename = filename;
		this._lastRecordTime = undefined;
		this._timer = 0;
		this._numPoints = numPoints;
		this._recordInterval = recordInterval;
		this._getValueCallback = getValueCallback;
		this._selector = selector;
	}

	_createClass(Recorder, [{
		key: 'update',
		value: function update(deltaTime) {
			if (this.values.length < this._numPoints) {
				this._timer += deltaTime;
				if (this._lastRecordTime === undefined || this._timer - this._lastRecordTime > this._recordInterval) {
					this._record(this._getValueCallback());
					if (this._numPoints === this.values.length) {
						this._displayChart();
					}
				}
			}
		}
	}, {
		key: '_record',
		value: function _record(y) {
			this.values.push([this.values.length, y]);
		}
	}, {
		key: '_displayChart',
		value: function _displayChart() {
			var svg = d3.select(this._selector),
			    margin = { top: 20, right: 20, bottom: 30, left: 50 },
			    width = parseInt(svg.attr("width")) - margin.left - margin.right,
			    height = parseInt(svg.attr("height")) - margin.top - margin.bottom;

			svg.style("display", "block");

			var x = d3.scaleLinear().rangeRound([0, width]);

			var y = d3.scaleLinear().rangeRound([height, 0]);

			var line = d3.line().x(function (d) {
				return x(d[0]);
			}).y(function (d) {
				return y(d[1]);
			});

			x.domain(d3.extent(this.values, function (d) {
				return d[0];
			}));
			// make sure Y=0 is always shown
			if (this.values.some(function (e) {
				return e >= 0;
			})) {
				var yExtent = d3.extent(this.values, function (d) {
					return d[1];
				});
			} else {
				var yExtent = d3.extent([[0, 0]].concat(this.values), function (d) {
					return d[1];
				});
			}
			y.domain(yExtent);
			console.log(yExtent);

			// background
			var rectangle = svg.append("rect").attr("x", 0).attr("y", 0).attr("width", parseInt(svg.attr("width"))).attr("height", parseInt(svg.attr("height"))).attr("fill", "white");

			var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
			g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x));

			g.append("g").call(d3.axisLeft(y));

			g.append("path").datum(this.values).attr("fill", "none").attr("stroke", "steelblue").attr("stroke-linejoin", "round").attr("stroke-linecap", "round").attr("stroke-width", 1.5).attr("d", line);

			// target value (error=0)
			g.append("path").datum([[0, 0], [this.values[this.values.length - 1][0], 0]]).attr("fill", "none").attr("stroke", "red").attr("stroke-width", 1).style("stroke-dasharray", "4, 4").attr("d", line);

			// zaznacz zrzucenie piłki
			g.append("path").datum([[700, yExtent[0]], [700, yExtent[1]]]).attr("fill", "none").attr("stroke", "green").attr("stroke-width", 1).style("stroke-dasharray", "5, 5").attr("d", line);

			(0, _saveSvgAsPng.saveSvgAsPng)(svg.node(), this.filename);
		}
	}, {
		key: 'numPoints',
		get: function get() {
			return this._numPoints;
		}
	}]);

	return Recorder;
}();

exports.default = Recorder;

/***/ })

},[174]);