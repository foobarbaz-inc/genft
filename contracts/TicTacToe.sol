//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./RLAgent.sol";

contract TicTacToe {

    address private owner;
    address public model;
    uint256 gameCost;
    uint256 latestGameId;
    string public playerOneSymbol;
    string public playerTwoSymbol;

    struct Game {
        uint256 id;
        address playerOne; // player one will play X
        address playerTwo; // player two will play O
        address playerToMove;
        address winner;
        uint256[3][3] board;
        GameStatus status;
    }

    enum GameStatus {
        NotStarted,
        InProgress,
        Draw,
        PlayerOneWin,
        PlayerTwoWin
    }

    mapping (uint256 => Game) public games;

    event GameCreated(uint256 gameId, address creator);
    event GameJoined(uint256 gameId, address joiner);
    event Move(uint256 gameId, address mover, uint256 xLoc, uint256 yLoc, string symbol);
    event GameOver(uint256 gameId, GameStatus gameStatus);

    constructor(address model_, uint256 gameCost_) {
        owner = msg.sender;
        model = model_;
        gameCost = gameCost_;
        playerOneSymbol = 'X';
        playerTwoSymbol = 'O';
    }

    modifier validGame(uint256 gameId) {
        require(gameId <= latestGameId, "Game does not exist yet");
        _;
    }

    function createGame(bool autoplay) external payable returns (uint256){
        require(msg.value == gameCost, "Remit game cost");
        latestGameId++;
        Game storage game = games[latestGameId];
        game.id = latestGameId;
        game.playerOne = msg.sender;
        emit GameCreated(latestGameId, msg.sender);
        if (autoplay) {
            this.joinGame(latestGameId, true);
        }
        return latestGameId;
    }

    function joinGame(
        uint256 gameId,
        bool autoplay
    ) external payable validGame(gameId) {
        require(msg.value == gameCost, "Remit game cost");
        Game storage game = games[gameId];
        require(game.playerTwo == address(0), "Game already started");
        if (autoplay) {
            require(msg.sender == address(this), "Cannot choose autoplay");
            game.playerTwo = model;
            game.playerToMove = game.playerOne;
            game.status = GameStatus.InProgress;
            emit GameJoined(gameId, model);
        } else {
            game.playerTwo = msg.sender;
            game.playerToMove = game.playerOne;
            game.status = GameStatus.InProgress;
            emit GameJoined(gameId, msg.sender);
        }
    }

    function _checkGameEnd(Game storage game) internal returns (GameStatus gameStatus) {
        // check rows
        for (uint256 i = 0; i < 3; i++) {
            if ((game.board[i][0] != 0) && (game.board[i][0] == game.board[i][1]) && (game.board[i][1] == game.board[i][2])) {
                if (game.board[i][0] == 1) {
                    GameStatus status = GameStatus.PlayerOneWin;
                    game.winner = game.playerOne;
                    emit GameOver(game.id, status);
                    return status;
                } else {
                    GameStatus status = GameStatus.PlayerTwoWin;
                    game.winner = game.playerTwo;
                    emit GameOver(game.id, status);
                    return status;
                }
            }
        }
        // check columns
        for (uint256 i = 0; i < 3; i++) {
            if ((game.board[0][i] != 0) && (game.board[0][i] == game.board[1][i]) && (game.board[1][i] == game.board[2][i])) {
                if (game.board[0][i] == 1) {
                    GameStatus status = GameStatus.PlayerOneWin;
                    game.winner = game.playerOne;
                    emit GameOver(game.id, status);
                    return status;
                } else {
                    GameStatus status = GameStatus.PlayerTwoWin;
                    game.winner = game.playerTwo;
                    emit GameOver(game.id, status);
                    return status;
                }
            }
        }
        // check diagonals
        if ((game.board[0][0] != 0) && (game.board[0][0] == game.board[1][1]) && (game.board[1][1] == game.board[2][2])) {
            if (game.board[0][0] == 1) {
                GameStatus status = GameStatus.PlayerOneWin;
                game.winner = game.playerOne;
                emit GameOver(game.id, status);
                return status;
            } else {
                GameStatus status = GameStatus.PlayerTwoWin;
                game.winner = game.playerTwo;
                emit GameOver(game.id, status);
                return status;
            }
        }
        if ((game.board[0][2] != 0) && (game.board[0][2] == game.board[1][1]) && (game.board[1][1] == game.board[2][0])) {
            if (game.board[0][2] == 1) {
                GameStatus status = GameStatus.PlayerOneWin;
                game.winner = game.playerOne;
                emit GameOver(game.id, status);
                return status;
            } else {
                GameStatus status = GameStatus.PlayerTwoWin;
                game.winner = game.playerTwo;
                emit GameOver(game.id, status);
                return status;
            }
        }
        // check draw
        for (uint256 i = 0; i < 3; i++) {
            for (uint256 j = 0; j < 3; j++) {
                if (game.board[i][j] == 0) {
                    return GameStatus.InProgress;
                }
            }
        }
        emit GameOver(game.id, GameStatus.Draw);
        return GameStatus.Draw;
    }

    function move(
        uint256 gameId,
        uint256 xLoc,
        uint256 yLoc
    ) external validGame(gameId) returns (GameStatus){
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");
        // add if statement to allow callback to come from oracle
        require(game.playerToMove == msg.sender, "Not your turn");
        require(((xLoc <= 2) && (yLoc <= 2)), "Out of bounds move");
        require(game.board[xLoc][yLoc] == 0, "Spot already taken");
        if (msg.sender == game.playerOne) {
            game.board[xLoc][yLoc] = 1;
            emit Move(gameId, msg.sender, xLoc, yLoc, playerOneSymbol);
            game.playerToMove = game.playerTwo;
        } else {
            game.board[xLoc][yLoc] = 2;
            emit Move(gameId, msg.sender, xLoc, yLoc, playerTwoSymbol);
            game.playerToMove = game.playerOne;
        }
        // now check if the game ends
        GameStatus newGameStatus = _checkGameEnd(game);
        game.status = newGameStatus;
        if ((game.status == GameStatus.InProgress) && (game.playerTwo == model)) {
            RLAgent agent = RLAgent(model);
            agent.run(game.id, this.move.selector);
        }
        return game.status;
    }

    // if you won a game, you can withdraw 2x gameCost
    // todo audit, this is probably insecure
    function withdraw(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.winner == msg.sender, "Not eligible for prize");
        (bool success,) = game.winner.call{value: 2 * gameCost}("");
        require(success, "Payment failed");
    }
}
