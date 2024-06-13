import { beginCell, contractAddress, toNano, TonClient4, WalletContractV4, internal, fromNano } from "@ton/ton";
import { mnemonicToPrivateKey } from "ton-crypto";
import { buildOnchainMetadata } from "./utils/jetton-helpers";

import { SampleJetton, storeMint } from "./output/SampleJetton_SampleJetton";
import { JettonDefaultWallet, TokenBurn } from "./output/SampleJetton_JettonDefaultWallet";

import { printSeparator } from "./utils/print";
import * as dotenv from "dotenv";
import { getHttpV4Endpoint } from "@orbs-network/ton-access";
dotenv.config();

(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    const endpoint = await getHttpV4Endpoint({
        // network: "testnet",
    });
    const client4 = new TonClient4({
        endpoint,
    });
    let mnemonics = (process.env.MNEMONICS || "").toString(); // 🔴 Change to your own, by creating .env file!
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let workchain = 0; // we are working in basechain.
    let deployer_wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    console.log(deployer_wallet.address);

    let deployer_wallet_contract = client4.open(deployer_wallet);

    const jettonParams = {
        name: "Syntax",
        description: "Syntax jetton token",
        symbol: "STX",
        image: "https://syntax-tma.vercel.app/jettonIcon.svg",
    };

    // Create content Cell
    let content = buildOnchainMetadata(jettonParams);

    // Compute init data for deployment
    // NOTICE: the parameters inside the init functions were the input for the contract address
    // which means any changes will change the smart contract address as well
    let init = await SampleJetton.init(deployer_wallet_contract.address, content);
    let jettonMaster = contractAddress(workchain, init);
    let deployAmount = toNano("0.15");

    let supply = toNano(100); // 🔴 Specify total supply in nano
    let packed_msg = beginCell()
        .store(
            storeMint({
                $$type: "Mint",
                amount: supply,
            })
        )
        .endCell();

    // send a message on new address contract to deploy it
    let seqno: number = await deployer_wallet_contract.getSeqno();
    console.log("🛠️Preparing new outgoing massage from deployment wallet. \n" + deployer_wallet_contract.address);
    console.log("Seqno: ", seqno + "\n");
    printSeparator();

    // Get deployment wallet balance
    let balance: bigint = await deployer_wallet_contract.getBalance();

    console.log("Current deployment wallet balance = ", fromNano(balance).toString(), "💎TON");
    console.log("Minting:: ", fromNano(supply));
    printSeparator();

    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: jettonMaster,
                value: deployAmount,
                init: {
                    code: init.code,
                    data: init.data,
                },
                body: packed_msg,
            }),
        ],
    });
    console.log("====== Deployment message sent to =======\n", jettonMaster);
})();
