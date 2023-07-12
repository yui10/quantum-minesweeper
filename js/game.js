const GameItem = {
    /**爆弾のマス */
    BOMB: Symbol(),
    /**空白のマス */
    EMPTY: Symbol(),
    /**設置禁止区域 */
    PROHIBITED_AREA: Symbol()
};

const CellStatus = {
    /**開けたマス */
    Open: Symbol("Open"),
    /**まだ開けていないマス */
    NotOpened: Symbol("NotOpened"),
    /**旗を置いたマス */
    FLAG: Symbol("Flag"),
    /**爆弾のマス,ゲームオーバー時のみセットされる */
    BOMB: Symbol("BOMB"),
}

const GameStatus = {
    /** 初期化 */
    INITIALIZED: Symbol("initialized"),
    PLAYING: Symbol("Playing"),
    END: Symbol("End")
}

const OperationStatus = {
    Success: Symbol("Success"),
    GameOver: Symbol("GameOver"),
    GameClear: Symbol("GameClear"),
    NoOperation: Symbol("NoOperation"),
    None: Symbol("None")
}

class Game {
    #base_board = [[], [], []];
    get Board() { return this.#base_board[1].map(list => ({ ...list })); }

    #width = 9;
    get Width() { return this.#width; }

    #height = 9;
    get Height() { return this.#height; }

    #BombCount = 10;
    get BombCount() { return this.#BombCount; }

    #NowFlagCount = 0;
    /**現在の爆弾マスの合計 */
    get NowFlagCount() { return this.#NowFlagCount; }

    #NowEmptyCount = 9 * 9 - 10;
    /**現在の未開封マスの合計 */
    get NowEmptyCount() { return this.#NowEmptyCount; }

    #GameStatus;
    get GameStatus() { return this.#GameStatus; }

    /**
     * 
     * @param {number} width default value : 9
     * @param {number} height default value : 9
     * @param {number} BombCount default value : 10
     */
    constructor(width, height, BombCount) {
        this.#width = width;
        this.#height = height;
        this.#BombCount = BombCount;
        this.#NowEmptyCount = width * height - BombCount;
        this.#GameStatus = GameStatus.INITIALIZED;

        for (let i = 0; i < this.#height; i++) {
            this.#base_board[0][i] = Array(this.#width).fill(GameItem.EMPTY);
            this.#base_board[1][i] = Array(this.#width).fill(CellStatus.NotOpened);
        }
    }

    /**
     * 0~n-1の乱数を生成する
     * @param {number} n 
     * @returns 0~n-1の乱数
     */
    #random = (n) => Math.floor(Math.random() * n);

    /**
     * 数値を min<=n<=max になるように丸める
     * @param {number} n 
     * @param {number} min 
     * @param {number} max 
     * @returns 
     */
    #clamp = (n, min, max) => Math.max(Math.min(n, max), min);

    /**
     * (y,x)を中心とする3*3の範囲の繰り返しをおこなう
     * @param {number} y 
     * @param {number} x 
     * @param {callback} callback (y,x)を引数とするコールバック
     */
    #Around = (y, x, callback) => {
        const xMin = Math.max(0, x - 1), xMax = Math.min(this.#width, x + 2);
        const yMin = Math.max(0, y - 1), yMax = Math.min(this.#height, y + 2);
        for (let i = yMin; i < yMax; i++) {
            for (let j = xMin; j < xMax; j++) {
                callback(i, j);
            }
        }
    };

    #CreateBoard(y, x) {
        this.#GameStatus = GameStatus.PLAYING;
        this.#Around(y, x, (y, x) => {
            this.#base_board[0][y][x] = GameItem.PROHIBITED_AREA;
        });

        for (let i = 0; i < this.#BombCount; i++) {
            while (true) {
                let r_y = this.#random(this.#height);
                let r_x = this.#random(this.#width);
                if (this.#base_board[0][r_y][r_x] === GameItem.EMPTY) {
                    this.#base_board[0][r_y][r_x] = GameItem.BOMB;
                    break;
                }
            }
        }

        for (let i = 0; i < this.#height; i++) {
            this.#base_board[2][i] = Array(this.#width).fill(0);
            for (let j = 0; j < this.#width; j++) {
                this.#base_board[2][i][j] = this.#CountAroundItemCell(i, j, GameItem.BOMB, this.#base_board[0]);
            }
        }
    }

    /**
     * マスをクリックする操作
     * @param {number} y 
     * @param {number} x 
     * @param {boolean} flag - true : フラグ(旗)を立てる, false : マスを開ける
     */
    Click = (y, x, flag) => flag ? this.#Flag(y, x) : this.#Open(y, x);

    /**
     * マスを開ける
     * @param {*} y 
     * @param {*} x 
     * @returns {OperationStatus} 実行結果
     */
    #Open(y, x) {
        if (this.#GameStatus === GameStatus.END) return OperationStatus.NoOperation;
        if (this.#base_board[1][y][x] !== CellStatus.NotOpened) return;

        if (this.#GameStatus === GameStatus.INITIALIZED) this.#CreateBoard(y, x);

        if (this.#base_board[0][y][x] === GameItem.BOMB) {
            this.#GameStatus = GameStatus.END;
            this.#GameOver();
            return OperationStatus.GameOver;
        }


        let stack = [[y, x]];
        do {
            let data = stack.pop();
            let p_y = data[0], p_x = data[1];
            if (this.#base_board[1][p_y][p_x] !== CellStatus.Open) {
                this.#NowEmptyCount--;
            }
            this.#base_board[1][p_y][p_x] = CellStatus.Open;

            const around_bomb = this.#CountAroundItemCell(p_y, p_x, GameItem.BOMB, this.#base_board[0]);
            //周囲に存在する爆弾の個数が0の場合
            if (around_bomb == 0) {
                //周囲の座標を格納する
                this.#Around(p_y, p_x, (y, x) => {
                    if (p_x == x && p_y == y) return;
                    if (this.#base_board[1][y][x] !== CellStatus.Open) {
                        stack.push([y, x]);
                    }
                })
            }
        } while (stack.length);


        this.#NowEmptyCount = this.#CountAllItemCell(CellStatus.NotOpened, this.#base_board[1]);
        if (this.#NowFlagCount + this.#NowEmptyCount == this.#BombCount) {
            this.#GameStatus = GameStatus.END;
            return OperationStatus.GameClear;
        }

        return OperationStatus.Success;
    }

    #Flag(y, x) {
        if (this.#GameStatus !== GameStatus.PLAYING) return OperationStatus.NoOperation;
        if (this.#base_board[1][y][x] === CellStatus.Open) return OperationStatus.NoOperation;

        if (this.#base_board[1][y][x] === CellStatus.NotOpened) {
            this.#base_board[1][y][x] = CellStatus.FLAG;
            this.#NowFlagCount++
            this.#NowEmptyCount--;
        }
        else {
            this.#base_board[1][y][x] = CellStatus.NotOpened;
            this.#NowFlagCount--
            this.#NowEmptyCount++;
        }

        return OperationStatus.Success;
    }

    /**
     * 現在のボムの状態を観測し、周囲に存在する数をカウントする
     * @returns 周囲に存在する数が格納された2次元配列
     */
    GetBombCountMap() {
        let Quantum_map = []
        const item = [GameItem.EMPTY, GameItem.BOMB];
        for (let i = 0; i < this.#height; i++) {
            Quantum_map[i] = Array(this.#width).fill(GameItem.EMPTY);
            for (let j = 0; j < this.#width; j++) {
                if (this.#base_board[0][i][j] === GameItem.BOMB) {
                    Quantum_map[i][j] = item[this.#random(item.length)];
                }
            }
        }

        //周囲のボムをカウントし配列へ格納
        let Bomb_count_map = []
        for (let i = 0; i < this.#height; i++) {
            Bomb_count_map[i] = Array(this.#width).fill(0);
            for (let j = 0; j < this.#width; j++) {
                if (this.#base_board[1][i][j] === CellStatus.Open) {
                    Bomb_count_map[i][j] = (this.#base_board[2][i][j] === 0) ? "" : this.#CountAroundItemCell(i, j, GameItem.BOMB, Quantum_map);
                }
            }
        }
        return Bomb_count_map;
    }

    /**
     * 周囲に存在する指定アイテムをカウントする
     * @param {number} y 
     * @param {number} x 
     * @param {*} item 
     * @param {Array} board 
     * @returns {number} カウント
     */
    #CountAroundItemCell(y, x, item, board) {
        let count = 0;
        this.#Around(y, x, (i, j) => {
            if (i == y && j == x) return;
            if (board[i][j] === item) count++;
        })
        return count;
    }

    #CountAllItemCell(item, board) {
        let count = 0;
        for (let i = 0; i < this.#height; i++) {
            for (let j = 0; j < this.#width; j++) {
                if (board[i][j] === item) count++;
            }
        }
        return count;
    }

    #GameOver() {
        for (let i = 0; i < this.#height; i++) {
            for (let j = 0; j < this.#width; j++) {
                if (this.#base_board[0][i][j] === GameItem.BOMB && this.#base_board[1][i][j] !== CellStatus.FLAG) {
                    this.#base_board[1][i][j] = CellStatus.BOMB;
                }
            }
        }
    }
}