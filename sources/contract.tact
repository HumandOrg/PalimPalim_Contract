import "./jetton";

message Mint {
    amount: Int;
}
message MintByOwner {
    amount: Int;
    receiver: Address;
}
message MintEmit {
    amount: Int;
    sender: Address;
    generateNmu: Int;
}

contract SampleJetton with Jetton {
    total_supply: Int as coins;
    owner: Address;
    content: Cell;
    mintable: Bool;


    init(owner: Address, content: Cell) {
        self.total_supply = 0;
        self.owner = owner;
        self.mintable = true;
        self.content = content;
    }

    receive(msg: Mint) { // 0xfc708bd2
        let ctx: Context = context();
        require(self.mintable, "Not mintable");
        self.mint(ctx.sender, msg.amount, ctx.sender); // (to, amount, response_destination)
        emit (MintEmit{
            amount: msg.amount,
            sender: ctx.sender,
            generateNmu: nativeRandom()
        }.toCell());
    }

    receive(msg: MintByOwner) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Not owner");
        require(self.mintable, "Not mintable");
        self.mint(msg.receiver, msg.amount, self.owner); // (to, amount, response_destination)
    }

    receive("Mint: 100") { // Public Minting
        let ctx: Context = context();
        require(self.mintable, "Not mintable");
        self.mint(ctx.sender, 100, self.owner); // 🔴 
    }

    receive("Owner: MintClose") {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Not owner");
        self.mintable = false;
    }
} 