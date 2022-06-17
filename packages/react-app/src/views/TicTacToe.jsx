import { Button, Card, Col, DatePicker, Divider, Image, Input, List, Progress, Radio, Row, Slider, Spin, Switch } from "antd";
import React, { useCallback, useState, useEffect } from "react";
import { utils } from "ethers";
import { useContractReader } from "eth-hooks";
import { useEventListener } from "eth-hooks/events/useEventListener";
import { SyncOutlined } from "@ant-design/icons";

import { Address, Balance, Events } from "../components";


export default function TicTacToe({
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  const [gameSelected, setGameSelected] = useState(null);
  const [gameBoard, setGameBoard] = useState([[]]);
  const [gameStatus, setGameStatus] = useState(null);
  const [games, setGames] = useState([]);
  const [availableGames, setAvailableGames] = useState([]);
  const [nfts, setNfts] = useState([]);
  const [useAI, setUseAI] = useState(false);

  const gameCreatedEvents = useEventListener(readContracts, "TicTacToe", "GameCreated", localProvider, 0);
  const gameJoinedEvents = useEventListener(readContracts, "TicTacToe", "GameJoined", localProvider, 0);
  const gameMoveEvents = useEventListener(readContracts, "TicTacToe", "Move", localProvider, 0);
  const gameOverEvents = useEventListener(readContracts, "TicTacToe", "GameOver", localProvider, 0);

  const refreshGameList = useCallback(async () => {
    try {
      var totalGameNum = await readContracts.TicTacToe.latestGameID();
      console.log("Latest game ID: ", totalGameNum);
      var tokensOwned = [];
      var games = [];
      var availableGameIds = [];
      for (var i = 0; i < totalGameNum; i++) {
        var game = await readContracts.TicTacToe.games(i);
        games.push(game);
        if (games[i].status == 0) {
          availableGameIds.push(parseInt(games[i].id.toString()));
        }
      }
      console.log("games: ", games);
      setGames(games);
      console.log("available games: ", availableGames);
      setAvailableGames(availableGameIds);
    } catch (e) {
      console.log(e);
    }
  }, [gameCreatedEvents, gameJoinedEvents]);

  const refreshGame = useCallback(async () => {
    if (gameSelected !== null) {
      try {
        var game = await readContracts.TicTacToe.games(gameSelected);
        var gameBoard = await readContracts.TicTacToe.getGameBoard(gameSelected);
        setGameBoard(gameBoard);
        setGameStatus(game.status);
      } catch (e) {
        console.log(e);
      }
    }
  }, [gameMoveEvents, gameOverEvents])

  const onChange = (e) => {
    console.log('radio checked', e.target.value);
    setUseAI(e.target.value);
  };

  useEffect(() => {
    refreshGameList();
  }, []);

  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 1000, margin: "auto", marginTop: 64 }}>
        <h2>AI TicTacToe:</h2>
        <Divider />
        <div style={{ margin: "auto", width: 400 }}>
          <Input
            onChange={e => {
              setGameSelected(parseInt(e.target.value));
            }}
          />
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              /* look how you call setPrompt on your contract: */
              /* notice how you pass a call back for tx updates too */
              const result = tx(writeContracts.EvolvingNFT.joinGame(gameSelected, false), update => {
                console.log("📡 Transaction Update:", update);
                if (update && (update.status === "confirmed" || update.status === 1)) {
                  console.log(" 🍾 Transaction " + update.hash + " finished!");
                  console.log(
                    " ⛽️ " +
                      update.gasUsed +
                      "/" +
                      (update.gasLimit || update.gas) +
                      " @ " +
                      parseFloat(update.gasPrice) / 1000000000 +
                      " gwei",
                  );
                }
              });
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
              refreshGame();
            }}
          >
            Join an existing available game! Enter the ID here.
          </Button>
        </div>
        <Divider />
        <Radio.Group onChange={onChange} useAI={useAI}>
          <Radio useAI={false}>No</Radio>
          <Radio useAI={true}>Yes</Radio>
        </Radio.Group>
        <Button
          style={{ marginTop: 8 }}
          onClick={async () => {
            /* look how you call setPrompt on your contract: */
            /* notice how you pass a call back for tx updates too */
            const result = tx(writeContracts.EvolvingNFT.mint(address, prompt), update => {
              console.log("📡 Transaction Update:", update);
              if (update && (update.status === "confirmed" || update.status === 1)) {
                console.log(" 🍾 Transaction " + update.hash + " finished!");
                console.log(
                  " ⛽️ " +
                    update.gasUsed +
                    "/" +
                    (update.gasLimit || update.gas) +
                    " @ " +
                    parseFloat(update.gasPrice) / 1000000000 +
                    " gwei",
                );
              }
            });
            console.log("awaiting metamask/web3 confirm result...", result);
            console.log(await result);
            refreshGame();
          }}
        >
        Create a game!
        </Button>
        <Divider />
        <div>
        <Row gutter={[24, 24]}>
          <Col span={6}><Card /></Col>
          <Col span={6}><Card /></Col>
          <Col span={6}><Card /></Col>
        </Row>
        </div>
        <div>
        <Row gutter={[24, 24]}>
          <Col span={6}><Card /></Col>
          <Col span={6}><Card /></Col>
          <Col span={6}><Card /></Col>
        </Row>
        </div>
        <div>
        <Row gutter={[24, 24]}>
          <Col span={6}><Card /></Col>
          <Col span={6}><Card /></Col>
          <Col span={6}><Card /></Col>
        </Row>
        </div>
        <Divider />
        <List
          grid={{
            gutter: 16,
            column: 4,
          }}
          dataSource={nfts}
          renderItem={(item) => (
            <List.Item>
              <Card title={item.tokenPrompt}>
                <Image src={item.uri}/>
              </Card>
            </List.Item>
          )}
        />
        TicTacToe Contract Address:
        <Address
          address={readContracts && readContracts.TicTacToe ? readContracts.TicTacToe.address : null}
          ensProvider={mainnetProvider}
          fontSize={16}
        />
        <Divider />
      </div>
    </div>
  );
}
