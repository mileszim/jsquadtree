/*!
* quadtree.js: a JavaScript QuadTree implementation
* https://github.com/etlgfx/jsquadtree
* License MIT (c) Eric Liang <etlgfx>
*/
(function (name, definition) {
	if (typeof define == 'function') //we're probably using require.js or similar
		define(definition);
	else if (typeof module != 'undefined') //we're probably using node.js
		module.exports = definition();
	else //we're probably loading this directly in browser so assign the result to this (ie. window)
		this[name] = definition();
})('quadtree', function () {

	/**
	 * @var maxFill default maximum number of objects inside each quad before subdividing
	 */
	QuadTree.maxFill = 2;

	/**
	 * @var maxDepth default maximum depth of subdivision
	 */
	QuadTree.maxDepth = 6;

	/**
	 * constructor
	 *
	 * @param Object config {
	 *    x: Number, (required)
	 *    y: Number, (required)
	 *    size: Number, (required)
	 *    depth: Number, (optional, auto set, don't pass manually)
	 *    maxDepth: Number, (optional)
	 *    maxFill: Number, (optional)
	 * }
	 */
	function QuadTree(config) {
		if (config === undefined || config.x === undefined || config.y === undefined || config.size === undefined)
			throw 'x,y,size are required';

		this.bounds = [config.x, config.y, config.x + config.size, config.y + config.size];
		this.depth = config.depth === undefined ? 0 : config.depth;
		this.size = config.size;

		this.objects = [];
		this.children = null;

		this.config = {
			maxFill: config.maxFill === undefined ? QuadTree.maxFill : config.maxFill,
			maxDepth: config.maxDepth === undefined ? QuadTree.maxDepth : config.maxDepth
		};
	}

	/**
	 * return all points inside the same box as point
	 *
	 * @param Array point [x, y]
	 *
	 * @return Array of objects
	 */
	QuadTree.prototype.query = function (point) {
		if (!this.boundsCheck(point)) {
			return [];
		}

		if (this.children === null) {
			return this.objects;
		}

		var result = [];

		/*
		this.children.forEach(function (e) {
			result = result.concat(e.query(point));

			if (result.length)
				break;
		}); //TODO break doesn't work from forEach, some may work, but isn't as clear?
		*/

		for (var i = 0; i < this.children.length; i++) {
			result = result.concat(this.children[i].query(point));

			if (result.length)
				break;
		}

		return result;
	};

	/**
	 * return the quad that contains given points
	 *
	 * @param Array point [x, y]
	 *
	 * @return QuadTree or undefined
	 */
	QuadTree.prototype.queryQuad = function (point) {
		if (!this.boundsCheck(point)) {
			return;
		}

		if (this.children === null) {
			return this;
		}

		var result;

		for (var i = 0; i < this.children.length; i++) {
			result = this.children[i].queryQuad(point);

			if (result !== undefined)
				return result;
		}
	};

	/**
	 * search or all objects inside the QuadTree within the given bounds. This
	 * method assumes topleft and bottomright to be in their correct respective
	 * orders
	 *
	 * TODO ??modify queryBounds param to {top: y, left: x, bottom: y, right: x}??
	 *
	 * @param Array topleft [x, y]
	 * @param Array bottomright [x, y]
	 *
	 * @return Array of objects
	 */
	QuadTree.prototype.queryBounds = function (topleft, bottomright) {
		if (this.bounds[2] < topleft[0] || bottomright[0] < this.bounds[0] ||
			this.bounds[3] < topleft[1] || bottomright[1] < this.bounds[1]) {
			return [];
		}

		var result = [];

		if (this.children === null) {
			this.objects.forEach(function (o) {
				if (o.key[0] >= topleft[0] && o.key[0] <= bottomright[0] &&
					o.key[1] >= topleft[1] && o.key[1] <= bottomright[1]) {
					result.push(o);
				}
			});
		}
		else {
			this.children.forEach(function (c) {
				result = result.concat(c.queryBounds(topleft, bottomright));
			});
		}

		return result;
	};

	/**
	 * insert a new object into the QuadTree, if necessary subdivide the
	 * current Quad depending on the maxFill and maxDepth config options
	 *
	 * @param Array point [x, y]
	 * @param Object obj - anything you want to insert
	 *
	 * @return QuadTree - this if the object was inserted, undefined if the object was outside
	 * the bounds
	 */
	QuadTree.prototype.insert = function (point, obj) {
		if (!this.boundsCheck(point)) {
			return;
		}

		if (this.children === null && (this.objects.length < this.config.maxFill || this.depth >= this.config.maxDepth)) {
			this.objects.push({key: point, value: obj});
			return this;
		}

		if (this.children === null) {
			this.subdivide();
		}

		if (this.children[0].insert(point, obj)) return this;
		if (this.children[1].insert(point, obj)) return this;
		if (this.children[2].insert(point, obj)) return this;
		if (this.children[3].insert(point, obj)) return this;
	};

	/**
	 * check if the given point is within the bounds of the current Quad
	 *
	 * @param Array point [x, y]
	 *
	 * return bool
	 */
	QuadTree.prototype.boundsCheck = function (point) {
		if (!point || point === undefined)
			return false;

		if (point[0] < this.bounds[0]) return false;
		if (point[0] >= this.bounds[2]) return false;
		if (point[1] < this.bounds[1]) return false;
		if (point[1] >= this.bounds[3]) return false;

		return true;
	};

	/**
	 * subdivide the QuadTree instance. If there are objects inside the current
	 * Quad, they will be distributed over the resulting child Quads
	 */
	QuadTree.prototype.subdivide = function () {
		var size = this.size / 2;

		this.children = [
			new QuadTree({
				x: this.bounds[0],
				y: this.bounds[1],
				size: size,
				depth: this.depth + 1,
				maxFill: this.maxFill,
				maxDepth: this.maxDepth,
			}),
			new QuadTree({
				x: this.bounds[0] + size,
				y: this.bounds[1],
				size: size,
				depth: this.depth + 1,
				maxFill: this.maxFill,
				maxDepth: this.maxDepth,
			}),
			new QuadTree({
				x: this.bounds[0],
				y: this.bounds[1] + size,
				size: size,
				depth: this.depth + 1,
				maxFill: this.maxFill,
				maxDepth: this.maxDepth,
			}),
			new QuadTree({
				x: this.bounds[0] + size,
				y: this.bounds[1] + size,
				size: size,
				depth: this.depth + 1,
				maxFill: this.maxFill,
				maxDepth: this.maxDepth,
			}),
		];

		this.objects.splice(0, this.config.maxFill).forEach(function (o) {
			this.children.forEach(function (c) {
				c.insert(o.key, o.value);
			});
		}, this);
	};

	/**
	 * move an object from point to newpoint
	 *
	 * @param Array point [x, y]
	 * @param Object obj
	 * @param Array newpoint [x, y]
	 *
	 * @return QuadTree if object was moved
	 */
	QuadTree.prototype.move = function (point, obj, newpoint) {
		var quad = this.queryQuad(point);

		for (var i = 0; i < quad.children.length; i++) {
			if (quad.objects[i].key === point && quad.objects[i].value === obj) {
				if (quad.boundsCheck(newpoint)) {
					quad.objects[i].key = newpoint;
				}
				else {
					quad.objects.splice(i, 1);
					this.insert(newpoint, obj);
				}

				return this;
			}
		}
	};

	/**
	 * delete an object from point
	 *
	 * @return QuadTree object was deleted from
	 */
	QuadTree.prototype.remove = function (point, obj) {
		var quad = this.queryQuad(point);

		for (var i = 0; i < quad.children.length; i++) {
			if (quad.objects[i].key === point && quad.objects[i].value === obj) {
				quad.objects.splice(i, 1);
				return this;
			}
		}
	};

	/**
	 * constructor
	 */
	QuadTreeArray = function (size) {
		this.size = size;
		this.quads = [];
	};

	/**
	 */
	QuadTreeArray.prototype.insert = function (point, obj) {
		var qx = Math.floor(point[0] / this.size);
		var qy = Math.floor(point[1] / this.size);

		if (this.quads[qx]) {
			if (this.quads[qx][qy] === undefined) {
				this.quads[qx][qy] = new QuadTree();
			}
		}
		else {
			this.quads[qx] = [];
			this.quads[qx][qy] = new QuadTree();
		}

		return this.quads[qx][qy].insert(point, obj);
	};

	/**
	 */
	QuadTreeArray.prototype.query = function (point, obj) {};

	/**
	 */
	QuadTreeArray.prototype.queryBounds = function (point, obj) {};

	return QuadTree;
});
