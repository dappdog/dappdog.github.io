//n1x5kB2Fn6Ldwz17ExDL3kdxpgerChzB8E5
/**
 * Creates a pseudo-random value generator. The seed must be an integer.
 *
 * Uses an optimized version of the Park-Miller PRNG.
 * http://www.firstpr.com.au/dsp/rand31/
 */
function Random(seed) {
  this._seed = seed % 2147483647;
  if (this._seed <= 0) this._seed += 2147483646;
}

/**
 * Returns a pseudo-random value between 1 and 2^32 - 2.
 */
Random.prototype.next = function () {
  return this._seed = this._seed * 16807 % 2147483647;
};


/**
 * Returns a pseudo-random floating point number in range [0, 1).
 */
Random.prototype.nextFloat = function (opt_minOrMax, opt_max) {
  // We know that result of next() will be 1 to 2147483646 (inclusive).
  return (this.next() - 1) / 2147483646;
};


/////////////
function new_game(SEED, SIZE){
  return new GameManager(SIZE, ConsoleActuator, SEED, Random);
}

function process_actions(manager, actions){
  var str = actions; 
  var i;
  for(i = 0; i < str.length; i++) {
    var act = parseInt(str.charAt(i));
    manager.move(act);
  }
  return {"size": manager.size , "seed":manager.SEED, "score":manager.score, "over":manager.over , "won": manager.won};
}


function GameManager(size, Actuator, SEED, RNG) {
  this.size         = size; // Size of the grid
  this.actuator     = new Actuator;

  this.startTiles   = 2;

  this.SEED = SEED;
  this.RNG = new RNG(SEED);

  this.restart();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.actuator.restart();
  this.setup();
};

// Set up the game
GameManager.prototype.setup = function () {
  this.RNG = new Random(this.SEED);

  this.grid         = new Grid(this.size, this.RNG);

  this.score        = 0;
  this.over         = false;
  this.won          = false;

  
  // Add the initial tiles
  this.addStartTiles();

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};


var rands = ""

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    //var value = Math.random() < 0.9 ? 2 : 4;
    var value = this.RNG.nextFloat() < 0.9 ? 2 : 4;
    
    rands = rands+value;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  this.actuator.actuate(this.grid, {
    score: this.score,
    over:  this.over,
    won:   this.won
  });
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left
  console.log(this.score, direction);

  var self = this;

  if (this.over || this.won) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          console.log(merged.value);

          // The mighty 2048 tile
          if (merged.value === 2048) {
            self.won = true;
          }
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // up
    1: { x: 1,  y: 0 },  // right
    2: { x: 0,  y: 1 },  // down
    3: { x: -1, y: 0 }   // left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);
          if (other) {
          }

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};



function Grid(size, _RNG) {
  this.size = size;

  this.cells = [];

  this.build();

  this.RNG = _RNG;
}

// Build a grid of the specified size
Grid.prototype.build = function () {
  for (var x = 0; x < this.size; x++) {
    var row = this.cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      row.push(null);
    }
  }
};

// Find the first available random position
Grid.prototype.randomAvailableCell = function () {
  var cells = this.availableCells();

  if (cells.length) {
    return cells[Math.floor(this.RNG.nextFloat() * cells.length)];
  }
};

Grid.prototype.availableCells = function () {
  var cells = [];

  this.eachCell(function (x, y, tile) {
    if (!tile) {
      cells.push({ x: x, y: y });
    }
  });

  return cells;
};

// Call callback for every cell
Grid.prototype.eachCell = function (callback) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      callback(x, y, this.cells[x][y]);
    }
  }
};

// Check if there are any cells available
Grid.prototype.cellsAvailable = function () {
  return !!this.availableCells().length;
};

// Check if the specified cell is taken
Grid.prototype.cellAvailable = function (cell) {
  return !this.cellOccupied(cell);
};

Grid.prototype.cellOccupied = function (cell) {
  return !!this.cellContent(cell);
};

Grid.prototype.cellContent = function (cell) {
  if (this.withinBounds(cell)) {
    return this.cells[cell.x][cell.y];
  } else {
    return null;
  }
};

// Inserts a tile at its position
Grid.prototype.insertTile = function (tile) {
  this.cells[tile.x][tile.y] = tile;
};

Grid.prototype.removeTile = function (tile) {
  this.cells[tile.x][tile.y] = null;
};

Grid.prototype.withinBounds = function (position) {
  return position.x >= 0 && position.x < this.size &&
         position.y >= 0 && position.y < this.size;
};



function ConsoleActuator() {
}

ConsoleActuator.prototype.actuate = function (grid, metadata) {
  //if (metadata.over) self.message(false); // You lose
  //if (metadata.won) self.message(true); // You win!
}

ConsoleActuator.prototype.restart = function () {
  this.clearMessage();
};

ConsoleActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!"

  // if (ga) ga("send", "event", "game", "end", type, this.score);

  this.messageContainer.classList.add(type);
  console.log(type);
  console.log(message);
};

ConsoleActuator.prototype.clearMessage = function () {
  console.log("clean...");
};


function Tile(position, value) {
  this.x                = position.x;
  this.y                = position.y;
  this.value            = value || 2;

  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y };
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
};


'use strict';

var top_str = function(which, seed, size){
  return "" + size + "_" + seed + "_" + which;
}

var SC = function(){
  LocalContractStorage.defineMapProperty(this, "alltop10_score", { parse: function (text) {return text;}, stringify: function (o) { return o.toString();}});
  LocalContractStorage.defineMapProperty(this, "alltop10_addr", { parse: function (text) {return text;}, stringify: function (o) { return o.toString();}});
  LocalContractStorage.defineMapProperty(this, "alltop10_seed", { parse: function (text) {return text;}, stringify: function (o) { return o.toString();}});
  LocalContractStorage.defineMapProperty(this, "alltop10_size", { parse: function (text) {return text;}, stringify: function (o) { return o.toString();}});
  LocalContractStorage.defineMapProperty(this, "alltop10_action", { parse: function (text) {return text;}, stringify: function (o) { return o.toString();}});
  LocalContractStorage.defineMapProperty(this, "alltop10_res", { parse: function (text) {return text;}, stringify: function (o) { return o.toString();}});
  
  LocalContractStorage.defineMapProperty(this, "eachtop10_score", { parse: function (text) {return text;}, stringify: function (o) { return o.toString();}});
  LocalContractStorage.defineMapProperty(this, "eachtop10_addr", { parse: function (text) {return text;}, stringify: function (o) { return o.toString();}});
  LocalContractStorage.defineMapProperty(this, "eachtop10_action", { parse: function (text) {return text;}, stringify: function (o) { return o.toString();}});
  LocalContractStorage.defineMapProperty(this, "eachtop10_res", { parse: function (text) {return text;}, stringify: function (o) { return o.toString();}});
}

SC.prototype = {
    init: function(){
        return 0;
    },

    fetch_all: function(){
      var scores = [];
      var addrs = [];
      var seeds = [];
      var sizes = [];
      var res = [];
      var i;
      for(i = 0; i < 10; i++){
        if(this.alltop10_score.get(i) == null){
          break;
        }
        scores.push( this.alltop10_score.get(i) );
        addrs.push( this.alltop10_addr.get(i) );
        seeds.push( this.alltop10_seed.get(i) );
        sizes.push( this.alltop10_size.get(i) );
        res.push( this.alltop10_res.get(i) );
      }
      return JSON.stringify({"scores": scores, "addrs": addrs, "seeds": seeds, "sizes":sizes, "res": res});
    },

    fetch_some: function(seed, size){
      var scores = [];
      var addrs = [];
      var res = [];
      var i;
      for(i = 0; i < 10; i++){
        var idx = top_str(i, seed, size);
        if(this.eachtop10_score.get(idx) == null){
          break;
        }
        scores.push( this.eachtop10_score.get(idx) );
        addrs.push( this.eachtop10_addr.get(idx) );
        res.push(this.eachtop10_res.get(idx));
      }
      return JSON.stringify({"scores": scores, "addrs": addrs, "res": res});
    },

    addRecord: function(SEED, SIZE, ACTIONS){
      var ADDR = Blockchain.transaction.from;
      var G = new_game(SEED, SIZE);
      let __res = process_actions(G, ACTIONS);
      
      var RES = null;

      var size = __res['size'];
      var seed = __res['seed'];
      var score = __res['score'];
      var actions = ACTIONS;
      var addr = ADDR;


      if(__res['over']){
        RES = 'over';
      }else if(__res['won']){
        RES = 'won';
      }else{
        throw new Error("cannot submit unfinished game"+score);
      }


      var res = RES;


      var i;

      for(i=0; i < 10; i++){
        var _score = score;
        var _size = size;
        var _seed = seed;
        var _res = res;
        var _addr = addr;
        var _actions = actions;

        var tmp_score = this.alltop10_score.get(i);
        if(_score!= null && (tmp_score == null || tmp_score <= _score)){
          score = tmp_score;
          size = this.alltop10_size.get(i);
          seed = this.alltop10_seed.get(i);
          res = this.alltop10_res.get(i);
          addr = this.alltop10_addr.get(i);
          actions = this.alltop10_action.get(i);

          this.alltop10_score.put(i, _score);
          this.alltop10_size.put(i, _size);
          this.alltop10_seed.put(i, _seed);
          this.alltop10_res.put(i, _res);
          this.alltop10_addr.put(i, _addr);
          this.alltop10_action.put(i, _actions);       
        
        }else if(_score == null){
          break;
        }
      }

      
      score = __res['score'];
      actions = ACTIONS;
      addr = ADDR;
      res = RES;

      for(i=0; i < 10; i++){

        var idx = top_str(i, SEED, SIZE);

        var _score = score;
        var _res = res;
        var _addr = addr;
        var _actions = actions;

        var tmp_score = this.eachtop10_score.get(idx);
        if(_score!= null && (tmp_score == null || tmp_score <= _score)){
          score = tmp_score;
          res = this.eachtop10_res.get(idx);
          addr = this.eachtop10_addr.get(idx);
          actions = this.eachtop10_action.get(idx);

          this.eachtop10_score.put(idx, _score);
          this.eachtop10_res.put(idx, _res);
          this.eachtop10_addr.put(idx, _addr);
          this.eachtop10_action.put(idx, _actions);          
        }else if(_score == null){
          break;
        }
      }
    }
}

module.exports = SC;
