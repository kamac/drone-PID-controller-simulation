import * as d3 from "d3";
import { saveSvgAsPng } from 'save-svg-as-png';

export default class Recorder {
	/*
	Record a value over time and display it on a line chart
	*/

	constructor(getValueCallback, recordInterval, numPoints, selector = 'svg.chart', filename = 'chart.png') {
		this.values = [];
		this.filename = filename;
		this._lastRecordTime = undefined;
		this._timer = 0;
		this._numPoints = numPoints;
		this._recordInterval = recordInterval;
		this._getValueCallback = getValueCallback;
		this._selector = selector;
	}

	get numPoints() {
		return this._numPoints;
	}

	update(deltaTime) {
		if(this.values.length < this._numPoints) {
			this._timer += deltaTime;
			if(this._lastRecordTime === undefined || (this._timer - this._lastRecordTime) > this._recordInterval) {
				this._record(this._getValueCallback());
				if(this._numPoints === this.values.length) {
					this._displayChart();
				}
			}
		}
	}

	_record(y) {
		this.values.push([this.values.length, y]);
	}

	_displayChart() {
		var svg = d3.select(this._selector),
		    margin = {top: 20, right: 20, bottom: 30, left: 50},
		    width = parseInt(svg.attr("width")) - margin.left - margin.right,
		    height = parseInt(svg.attr("height")) - margin.top - margin.bottom;

		svg.style("display", "block");

		var x = d3.scaleLinear()
		    .rangeRound([0, width]);

		var y = d3.scaleLinear()
		    .rangeRound([height, 0]);

		var line = d3.line()
		    .x(function(d) { return x(d[0]); })
		    .y(function(d) { return y(d[1]); });

		x.domain(d3.extent(this.values, function(d) { return d[0]; }));
		// make sure Y=0 is always shown
		if(this.values.some((e) => e >= 0)) {
			var yExtent = d3.extent(this.values, function(d) { return d[1]; });
		} else {
			var yExtent = d3.extent([[0,0]].concat(this.values), function(d) { return d[1]; });
		}
		y.domain(yExtent);
		console.log(yExtent);

		// background
		var rectangle = svg.append("rect")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", parseInt(svg.attr("width")))
			.attr("height", parseInt(svg.attr("height")))
			.attr("fill", "white");

		let g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		g.append("g")
			.attr("transform", "translate(0," + height + ")")
		    .call(d3.axisBottom(x));

		g.append("g").call(d3.axisLeft(y))

		g.append("path")
			.datum(this.values)
		    .attr("fill", "none")
		    .attr("stroke", "steelblue")
		    .attr("stroke-linejoin", "round")
		    .attr("stroke-linecap", "round")
		    .attr("stroke-width", 1.5)
		    .attr("d", line);

		// target value (error=0)
		g.append("path")
			.datum([[0,0], [this.values[this.values.length-1][0],0]])
			.attr("fill", "none")
			.attr("stroke", "red")
			.attr("stroke-width", 1)
			.style("stroke-dasharray", "4, 4")
			.attr("d", line);

		// zaznacz zrzucenie piłki
		g.append("path")
			.datum([[700, yExtent[0]], [700, yExtent[1]]])
			.attr("fill", "none")
			.attr("stroke", "green")
			.attr("stroke-width", 1)
			.style("stroke-dasharray", "5, 5")
			.attr("d", line);

		saveSvgAsPng(svg.node(), this.filename);
	}
}