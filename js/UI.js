const createUI = (game) => {
    const elemBoard = document.getElementById("board");
    const elemField = document.getElementById("field");
    const elemStatus = document.getElementById("status");
    const elemBombCounter = document.getElementById("BombCounter");
    const elemTimer = document.getElementById("timer");
    const elemMessage = document.getElementById("GameMessage");
    const elemGameLevel = document.getElementById("gameLevel");
    const elemObservationButton = document.getElementById("observationButton");
    const elemTouch_menu = document.getElementById("touch-menu");

    let cells = [];
    let startTime = new Date();

    const resize = () => {
        // elemBoard.style.height = elemField.offsetHeight + elemStatus.offsetHeight;
        // elemBoard.style.width = elemField.style.width;
    };

    const timerEvent = () => {
        if (game.GameStatus === GameStatus.PLAYING) {
            elemTimer.innerHTML = Math.floor(((new Date()).getTime() - startTime.getTime()) / 1000).toString().padStart(3, "0");
        }
    };

    const levelChange = () => {
        const level = elemGameLevel.value.split(":");
        const width = parseInt(level[0]), height = parseInt(level[1]), bombCount = parseInt(level[2]);
        game = new Game(width, height, bombCount);
        elemField.style.width = `${width * 20}px`;
        elemField.style.height = `${height * 20}px`
        UICreate(width, height, bombCount);
        resize();
    };

    const click = (y, x, flag) => {
        let result = OperationStatus.None;
        let beforeGameStatus = game.GameStatus;
        result = game.Click(y, x, flag);

        switch (result) {
            case OperationStatus.GameClear:
            case OperationStatus.GameOver:
                elemMessage.innerHTML = `<p>${result.description.toUpperCase()}!<p>`;
            case OperationStatus.Success:
                if (beforeGameStatus === GameStatus.INITIALIZED) {
                    startTime = new Date();
                }
                cellStatusChange();
                elemBombCounter.innerHTML = (game.BombCount - game.NowFlagCount).toString().padStart(3, "0");
                break;
        }
    };

    const mouse = (event) => {
        event.preventDefault();
        if (event.target instanceof HTMLDivElement) {
            const x = parseInt(event.target.dataset.x);
            const y = parseInt(event.target.dataset.y);
            if (event.button == 0) { //左クリック
                click(y, x, false);
            }
            else if (event.button == 1) { //中央
            }
            else if (event.button == 2) { //右クリック
                click(y, x, true);
            }

        }
    };

    const touch = (event) => {
        event.preventDefault();

        elemTouch_menu.dataset.x = event.target.dataset.x;
        elemTouch_menu.dataset.y = event.target.dataset.y;

        const posX = event.touches[0].clientX;
        const posY = event.touches[0].clientY;
        elemTouch_menu.style.left = posX + 'px';
        elemTouch_menu.style.top = posY + 'px';
        elemTouch_menu.classList.add('show');
    };

    const init = () => {
        window.addEventListener("resize", resize);
        elemObservationButton.addEventListener("mousedown", () => {
            if (game.GameStatus === GameStatus.PLAYING) cellStatusChange();
        });

        elemGameLevel.addEventListener("change", levelChange);
        levelChange();

        document.getElementById("NewGameButton").addEventListener("mousedown", levelChange);

        elemField.oncontextmenu = () => false;
        elemField.addEventListener("mousedown", mouse);
        elemField.addEventListener("touchstart", touch);
        elemTouch_menu.addEventListener("click", (event) => {
            if (event.target instanceof HTMLDivElement) {
                const x = parseInt(elemTouch_menu.dataset.x);
                const y = parseInt(elemTouch_menu.dataset.y);
                click(y, x, (event.target.dataset.touchMenu == "flag"));
            }
        });

        document.body.addEventListener('click', () => {
            if (elemTouch_menu.classList.contains('show')) {
                elemTouch_menu.classList.remove('show');
                elemTouch_menu.dataset.x = elemTouch_menu.dataset.y = "";
            }
        });

        setInterval(timerEvent, 1000);
    };

    const cellStatusChange = () => {
        let map = game.GetBombCountMap();
        for (let i = 0; i < game.Height; i++) {
            for (let j = 0; j < game.Width; j++) {
                cells[i][j].className = CellStatus.NotOpened.description;
                cells[i][j].dataset.item = NaN;
                switch (game.Board[i][j]) {
                    case CellStatus.Open:
                        cells[i][j].className = CellStatus.Open.description;
                        cells[i][j].dataset.item = `${map[i][j]}`;
                        break;
                    case CellStatus.FLAG:
                        cells[i][j].dataset.item = "flag";
                        break;
                    case CellStatus.BOMB:
                        cells[i][j].className = CellStatus.Open.description;
                        cells[i][j].dataset.item = "Bomb";
                        break;
                    default:
                        break;
                }
            }
        }
    };

    const GameStatusChange = () => {
        switch (game.GameStatus) {
            case GameStatus.PLAYING:
                elemObservationButton.removeAttribute("disabled");
                elemObservationButton.style.color = "black";
                break;
            case GameStatus.END:
            case GameStatus.INITIALIZED:
                elemObservationButton.setAttribute("disabled", true);
                elemObservationButton.style.color = "white";
                break;
        }
    };

    const UICreate = (width, height, bombCount) => {
        elemBombCounter.innerHTML = bombCount.toString().padStart(3, "0");
        elemTimer.innerHTML = "000";
        elemMessage.innerHTML = "";
        //盤面削除
        while (elemField.firstChild) {
            elemField.removeChild(elemField.firstChild);
        }
        cells = [];
        for (let y = 0; y < height; y++) {
            const lines_item = document.createElement("div");
            cells[y] = [];
            for (let x = 0; x < width; x++) {
                const cells_item = document.createElement("div");
                cells_item.id = "cells";
                cells_item.dataset.x = x;
                cells_item.dataset.y = y;
                cells_item.dataset.item = NaN;
                lines_item.appendChild(cells_item);
                cells[y][x] = cells_item;
            }
            elemField.appendChild(lines_item);
        }
    };

    return {
        init
    };
};
let game = new Game(9, 9, 10);

let ui = createUI(game);
ui.init();