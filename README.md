# MOM client

MOM (My Own Messages) client is an [EIP-2848](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2848.md) compliant ÐApp that can notarize and share messages using Ethereum and IPFS. You can give voice to your smart contract, send messages to the world, create a certified blog with your ideas, and so on.

## How to use MOM client

A *live* version of MOM client can be found directly on your IPFS node: [ipfs://Qmd4TVXHgYoiHMgpyvJd165dyAb93mU8GZJ6Yv2YLxfdmY/](ipfs://Qmd4TVXHgYoiHMgpyvJd165dyAb93mU8GZJ6Yv2YLxfdmY/)

Or, for a more classical client-server approach, you can obtain and use the latest version of MOM client directly from:

- [ipfs.io gateway](https://ipfs.io/ipfs/Qmd4TVXHgYoiHMgpyvJd165dyAb93mU8GZJ6Yv2YLxfdmY/)
- [GitHub's servers](https://internetofpeers.github.io/mom-client)

MOM does not need a smart contract, so it is already available on every current and future Ethereum network (mainnet, rinkeby, kovan, ecc.): just choose one and you are ready to go.

## How to develop your own _MOM-enabled_ ÐApp

Clone the repository with:

```bash
git clone https://github.com/InternetOfPeers/mom-client.git
cd mom
npm install
npm start
```

Note: Use Node.js 12. Using Node.js 14+ you can experience some issues caused by some sub-dependency of webpack-dev-server
```bash
fsevents@1.2.13: fsevents 1 will break on node v14+ and could be using insecure binaries. Upgrade to fsevents 2.
```

## How to contribute to the MOM client

### Dealing with line endings

Please respect the current line endings strategy. See [Configuring Git to handle line endings](https://help.github.com/en/articles/dealing-with-line-endings) for more details.

### VSCode plugins

Development of this code is done with VSCode and in particular some plugins affect the formatting of the source code:

- Beautify ([hookyqr.beautify](https://marketplace.visualstudio.com/items?itemName=HookyQR.beautify))
- ESLint ([dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint))
- EditorConfig for VS Code ([editorconfig.editorconfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig))

## How to release (WIP waiting for grunt)

```bash
git checkout develop
git flow release start X.Y.Z
# modify verion in package.json and src/assets/template/index.html
npm run build
ipfs add -r dist
# change IPFS references (2) in README.md
git add *; git add -u
git commit -m "release vX.Y.Z"
git flow release finish
git push; git checkout master; git push; git push --tags
git checkout gh-pages
setopt rmstarsilent; rm *; rm -rf images; mv dist/* .
git add *; git add -u
git commit -m "release vX.Y.Z"
git push
```
