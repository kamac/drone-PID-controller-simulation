import Matter from "matter-js";

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Events = Matter.Events,
	Vector = Matter.Vector,
	Mouse = Matter.Mouse,
	MouseConstraint = Matter.MouseConstraint,
	Bodies = Matter.Bodies;

class PIDController {
	constructor(targetValue, errorScale, Kp, Ki, Kd) {
		this.targetValue = targetValue;
		this.Kp = Kp;
		this.Ki = Ki;
		this.Kd = Kd;
		this.errorScale = errorScale;

		this._previousError = 0;
		this._integral = 0;
	}

	calculateError(currentValue) {
		return this.targetValue - currentValue;
	}

	calculateOutput(currentValue) {
		let error = this.calculateError(currentValue) / this.errorScale;
		this._integral += error;
		let derivative = error - this._previousError;
		let output = this.Kp * error + this.Ki * this._integral + this.Kd * derivative;
		this._previousError = error;
		return output;
	}
}

class Drone {
	constructor(x, y) {
		this._width = 80;
		this._height = 20;
		this.body = Bodies.rectangle(x, y, this._width, this._height);
		
		// regulator wysokości (regulator PD) błąd przeskalowany, żeby przy 300 unitach różnicy wysokości użyć
		// maksymalnej mocy silnika
		this.heightController = new PIDController(300, 300 / 0.0025, 1, 0.006, 0.6);
		// regulator kąta nachylenia do podłoża (regulator PD)
		this.angularController = new PIDController(0, 10, 1, 0.01, 0.5);
	}

	update() {
		let heightForce = this.heightController.calculateOutput(this.body.position.y);
		// heightForce ograniczona do ustalonych wartości żeby symulować silniki drona
		// jeśli chcemy iść w dół, wyłączamy silniki
		// jeśli chcemy iść w górę, nie możemy tego zrobić z siłą większą niż 0.0025 prostopadłą do drona
		heightForce = Math.min(Math.max(heightForce, -0.0025), 0);

		let forceX = heightForce * Math.cos(this.body.angle + Math.PI / 2);
		let forceY = heightForce * Math.sin(this.body.angle + Math.PI / 2);
		this.body.force = Vector.create(forceX, forceY);

		if(this.angularController) {
			this.body.torque = this.angularController.calculateOutput(this.body.angle);
		}
	}
}

class Simulation {
	constructor() {
	}

	init() {
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
		this.drone = new Drone(300, 610-20);
		let bbLeft = Bodies.rectangle(0, 300, 60, 810, { isStatic: true });
		let bbRight = Bodies.rectangle(600, 300, 60, 810, { isStatic: true });
		let bbBottom = Bodies.rectangle(400, 610, 810, 60, { isStatic: true });
		let bbTop = Bodies.rectangle(400, 0, 810, 60, { isStatic: true });
		let circle = Bodies.circle(100, 500, 20);
		let circle2 = Bodies.circle(125, 500, 10);
		let circle3 = Bodies.circle(140, 500, 5);

		// add all of the bodies to the world
		World.add(this.engine.world, [this.drone.body, bbLeft, bbRight, bbTop, bbBottom, circle, circle2, circle3]);

		// add mouse control
		let mouse = Mouse.create(this.render.canvas),
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

		Events.on(this.engine, 'afterUpdate', (e) => this._afterUpdate(e));
	}

	_afterUpdate(event) {
		this.drone.update();
	}
}

export let simulation = new Simulation();

window.onload = function() {
	simulation.init();
}