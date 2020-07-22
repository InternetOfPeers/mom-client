# MOM client

MOM (My Own Messages) client is [MOM standard](https://github.com/InternetOfPeers/mom-spec) compliant ÐApp that can notarize and share messages using Ethereum and IPFS. You can give voice to your smart contract, send messages to the world, create a certified blog with your ideas, and so on.

## How to use MOM

A *live* version of MOM client can be found on IPFS:
- [TBD](#TBD) (if you have a local IPFS node, use this)
- [TBD](#TBD)

Or, with a more classic client-server approach, you can obtain and use the latest version of MOM client directly from the [GitHub's servers](https://internetofpeers.github.io/mom-client). MOM does not need a smart contract, so it is already available on every current and future Ethereum network (mainnet, rinkeby, kovan, ecc.): just choose one and you are ready to go.

## How to develop your own _MOM-enabled_ ÐApp

Clone the repository with:

```bash
$ git clone https://github.com/InternetOfPeers/mom-client.git
$ cd mom
$ npm install
$ npm start
```

## How to contribute to the MOM client

### Dealing with line endings
Please respect the current line endings strategy. See [Configuring Git to handle line endings](https://help.github.com/en/articles/dealing-with-line-endings) for more details.

### VSCode plugins
Development of this code is done with VSCode and in particular some plugins affect the formatting of the source code:
- Beautify ([hookyqr.beautify](https://marketplace.visualstudio.com/items?itemName=HookyQR.beautify))
- ESLint ([dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint))
- EditorConfig for VS Code ([editorconfig.editorconfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig))
