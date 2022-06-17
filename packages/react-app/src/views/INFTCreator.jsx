import { Button, Card, DatePicker, Divider, Image, Input, List, Progress, Slider, Spin, Switch } from "antd";
import React, { useCallback, useState, useEffect } from "react";
import { utils } from "ethers";
import { useContractReader } from "eth-hooks";
import { useEventListener } from "eth-hooks/events/useEventListener";
import { SyncOutlined } from "@ant-design/icons";

import { Address, Balance, Events } from "../components";


export default function INFTCreator({
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  const [prompt, setPrompt] = useState("");
  const [nftNum, setNftNum] = useState(0);
  const [nfts, setNfts] = useState([]);


  const refreshNfts = useCallback(async () => {
    try {
      var totalNftNum = await readContracts.EvolvingNFT2.balanceOf(address ?? '');
      console.log("NFT num: ", totalNftNum);
      setNftNum(totalNftNum);
      var tokensOwned = [];
      for (var i = 0; i < totalNftNum; i++) {
        var tokenId = await readContracts.EvolvingNFT2.tokenOfOwnerByIndex(address ?? '', i);
        var uri = await readContracts.EvolvingNFT2.tokenURI(tokenId);
        var tokenPrompt = await readContracts.EvolvingNFT2.tokenIdToDataInput(tokenId);
        tokensOwned.push({"uri": uri, "tokenPrompt": tokenPrompt, "tokenId": tokenId})
      }
      console.log("tokens owned: ", tokensOwned)
      setNfts(tokensOwned);
    } catch (e) {
      console.log(e);
    }
  }, [])

  const tokenUriSetEvents = useEventListener(readContracts, "EvolvingNFT2", "TokenUriSet", localProvider, 0);

  useEffect(() => {
    refreshNfts();
  }, [tokenUriSetEvents]);

  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 1000, margin: "auto", marginTop: 64 }}>
        <h2>iNFT Creator:</h2>
        <Divider />
        <div style={{ margin: "auto", width: 400 }}>
          <Input
            onChange={e => {
              setPrompt(e.target.value);
            }}
          />
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              /* look how you call setPrompt on your contract: */
              /* notice how you pass a call back for tx updates too */
              const result = tx(writeContracts.EvolvingNFT2.mint(address, prompt), update => {
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
              refreshNfts();
            }}
          >
            Mint with a prompt!
          </Button>
        </div>
        <Divider />
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
        Evolving NFT Contract Address:
        <Address
          address={readContracts && readContracts.EvolvingNFT2 ? readContracts.EvolvingNFT2.address : null}
          ensProvider={mainnetProvider}
          fontSize={16}
        />
        <Divider />
      </div>
    </div>
  );
}
