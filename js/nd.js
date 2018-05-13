function decontor(m, n) {
    var factorial = [];
    var tmp = 1;

    factorial.push(1);

    var i;
    for (i = 1; i < n; i++) {
        tmp *= i;
        factorial.push(tmp);
    }

    var v = [];
    var a = [];

    for (i = 0; i < n; i++) {
        v.push(i);
    }
    for (i = n; i >= 1; i--) {
        var r = m % factorial[i - 1];
        var t = Math.floor(m / factorial[i - 1]);
        m = r;
        //v.sort();
        a.push(v[t]);
        v.splice(t, 1);
    }
    return a;
}

function countInversions(array) {
    // Note: this uses a variant of merge sort

    //input handlers
    if (array === undefined) throw new Error("Array must be defined to count inversions");
    if (array.length === 0 || array.length === 1) return 0;

    var tally = 0; // count for inversions
    sort(array); // merge sort the array and increment tally when there are crossovers
    return tally;


    function sort(arr) {
        if (arr.length === 1) return arr;
        var right = arr.splice(Math.floor(arr.length / 2), arr.length - 1);
        return merge(sort(arr), sort(right));
    }

    function merge(left, right) {
        var merged = [];
        var l = 0,
            r = 0;
        var multiplier = 0;
        while (l < left.length || r < right.length) {
            if (l === left.length) {
                merged.push(right[r]);
                r++;
            } else if (r === right.length) {
                merged.push(left[l]);
                l++;
                tally += multiplier;
            } else if (left[l] < right[r]) {
                merged.push(left[l]);
                tally += multiplier;
                l++;
            } else {
                merged.push(right[r]);
                r++;
                multiplier++;
            }
        }
        return merged;
    }
}



function process_actions(manager, actions) {
    var str = actions;
    var i;
    for (i = 0; i < str.length; i++) {
        var act = parseInt(str.charAt(i));
        manager.move(act);
    }
    return {
        "size": manager.size,
        "seed": SEED,
        "score": manager.score,
        "over": manager.over,
        "won": manager.won
    };
}

var G;


document.addEventListener("DOMContentLoaded", function () {
    // Wait till the browser is ready to render the game (avoids glitches)
    window.requestAnimationFrame(function () {

        var i;
        var f = 1;
        for (i = 1; i <= NNN * NNN; i++) {
            f *= i;
        }

        while (true) {
            var seed = Math.floor(f * Math.random());
            G = new GameManager(NNN * NNN, seed, new console_viewer(), new KeyboardInputManager());
            if (G.state == 0) {
                break;
            } else {
                console.log(seed)
            }
        }
        G.listen();
        G.refresh();
    });
});



function score_of_game(G, moves){
    var i;
    for(i=0; i<moves.length; i++){
        var move = moves.charAt(i);
        G.movex(parseInt(move));
    }
    return G.score;
}


function GameManager(K, seed, viewer, inputManager) {
    this.inputManager = inputManager;

    this.viewer = viewer;

    this.reset(K, seed);

}

GameManager.prototype.reset = function(K, seed){
    this.K = K;
    this.seed = seed;
    this.init_perm = decontor(seed, K);

    this.state = 0;
    this.perm = this.init_perm;

    this.checkSolution();

    this.last_moved_to = -1;

    this.moves = "";

    var i;
    var f = 1;
    for (i = 1; i <=K; i++) {
        f *= i;
    }

    this.score = f;

    this.MAX_SCORE = f;
    this.f = f ;

    this.refresh();
}

GameManager.prototype.listen = function () {

    this.inputManager.on("move", this.movex.bind(this));

}

GameManager.prototype.refresh = function () {
    this.viewer.refresh(this);
}


GameManager.prototype.checkSolution = function () {
    var seq = [];
    var dist = -1;
    var i;
    var size = Math.sqrt(this.K);
    for (i = 0; i < this.perm.length; i++) {
        if (this.perm[i] != 0) {
            seq.push(this.perm[i])
        } else {
            dist = size - 1 - Math.floor(i / size);
        }
    }

    let a = countInversions(seq);

    var no = false;

    if (size % 2 == 1) {
        if (a % 2 == 1) {
            no = true;
        }
    } else {
        if (a % 2 == 1 || dist % 2 == 1) {
            no = true;
        }
    }
    if (no) {
        console.log("fail");
        this.state = -1;
    }
}

GameManager.prototype.iswon = function () {
    var win = true;
    var i;
    for (i = 0; i < this.K - 1; i++) {
        if (this.perm[i] != i + 1) {
            win = false;
        }
    }
    return win;
}

// 0 up; 1 down; 2 left; 3: right

function next(size, cur, direction) {
    var row = Math.floor(cur / size);
    var col = cur % size;

    if (direction == 0) {
        row += 1;
    } else if (direction == 1) {
        row -= 1;
    } else if (direction == 2) {
        col += 1;
    } else if (direction == 3) {
        col -= 1;
    }

    if (row < 0) {
        row = 0;
    } else if (row > size - 1) {
        row = size - 1;
    }

    if (col < 0) {
        col = 0;
    } else if (col > size - 1) {
        col = size - 1;
    }

    return row * size + col;
}

GameManager.prototype.movex = function (direction) {
    if (this.state == 1) {
        return 0;
    }

    var size = Math.sqrt(this.K);

    var i;
    var x = -1;
    for (i = 0; i < this.K; i++) {
        if (this.perm[i] == 0) {
            x = i;
            console.log("find empty", i, this.perm, direction);
            break;
        }
    }

    var y = next(size, x, direction);

    if (x != y) {
        this.moves += direction;
        let tmp = this.perm[x];
        this.perm[x] = this.perm[y];
        this.perm[y] = tmp;


        this.last_moved_to = x;

        this.score = this.MAX_SCORE - this.moves.length;


        if (this.iswon()) {
            this.state = 1;
        }

        console.log("move ref", x, y);
        this.viewer.refresh(this);
    } else {
        console.log("blocked");
    }
}

function console_viewer() {}

console_viewer.prototype.refresh = function (manager) {
    var i;
    var size = Math.sqrt(manager.K);

    console.log("refresh");

    $("#score").text(100000 - manager.MAX_SCORE + manager.score);
    $("#seed").val(manager.seed);
    
    $("#max_seed").text(manager.f);

    if (manager.iswon()) {
        $("#won").text("You win!");
    }else{
        $("#won").text("");
    }


    if (true || manager.last_moved_to == -1) {
        for (i = 0; i < manager.K; i++) {

            var row = Math.floor(i / size) + 1;
            var col = i % size + 1;
            var x = manager.perm[i];

            if (x != 0) {
                console.log(x, row, col);
                $("#i" + x).attr('class', "tile tile-4 tile-position-" + col + "-" + row + "");
            }

        }
    } else {
        var x = manager.perm[manager.last_moved_to];
        var i = manager.last_moved_to;

        var row = Math.floor(i / size) + 1;
        var col = i % size + 1;

        console.log(x, row, col);

        $("#i" + x).attr('class', "tile tile-4 tile-position-" + col + "-" + row + " tile-new");
    }





}


function KeyboardInputManager() {
    this.events = {};

    this.listen();
}

KeyboardInputManager.prototype.on = function (event, callback) {
    if (!this.events[event]) {
        this.events[event] = [];
    }
    this.events[event].push(callback);
};

KeyboardInputManager.prototype.emit = function (event, data) {
    var callbacks = this.events[event];
    if (callbacks) {
        callbacks.forEach(function (callback) {
            callback(data);
        });
    }
};

KeyboardInputManager.prototype.listen = function () {
    var self = this;

    var map = {
        38: 0, // Up
        39: 3, // Right
        40: 1, // Down
        37: 2 // Left
    };


    document.addEventListener("keydown", function (event) {
        var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
            event.shiftKey;
        var mapped = map[event.which];

        if (!modifiers) {
            if (mapped !== undefined) {
                event.preventDefault();
                console.log(mapped);
                self.emit("move", mapped);
            }
        }

        // Listen to swipe events
        var gestures = [Hammer.DIRECTION_UP, Hammer.DIRECTION_RIGHT,
            Hammer.DIRECTION_DOWN, Hammer.DIRECTION_LEFT
        ];

        var gameContainer = document.getElementsByClassName("game-container")[0];
        var handler = Hammer(gameContainer, {
            drag_block_horizontal: true,
            drag_block_vertical: true
        });

        handler.on("swipe", function (event) {
            event.gesture.preventDefault();
            mapped = gestures.indexOf(event.gesture.direction);

            if (mapped !== -1) self.emit("move", mapped);
        });

    });
}