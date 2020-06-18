# MOM

MOM (My Own Messages) client is a ÐApp to share and notarize messages with Ethereum and IPFS using the MOM standard. You can give voice to your smart contract, send messages to the world, create a certified blog with your ideas, and so on.

## How to use MOM

A *live* version of MOM can be found on IPFS:
- [TBD](#TBD) (if you have a local IPFS node, use this)
- [TBD](#TBD)

Or, you can also use the latest version directly from GitHub servers
- https://neurone.github.io/mom

## Project's rationales (WIP)

My Own Messages
"Just say it to MOM"

Create your Ethereum account dedicated to your personal messages
Spread your words to the world
Follow other

And do it all by yourself

How MOM can help me?

You can send messages to users of your ÐApp or Smart Contract, and they always know it is a voice reliable as the smart contract is.
Say once, show everywhere. Say something only once, it can be seen on every social platform (no more reply of the same post/opinion on dozens of sites like reddit, twitter, facebook, medium, disquis, and so on...)

Verificable and decentralized content

Small fee to be free: pay just few cents of dollar to notarize your messages, and distribute them with IPFS or Swarm.

Get tips for your words directly into your wallet.

MOM is already available on every Ethereum network (mainnet, rinkeby, kovan, ecc.): just choose one and you are there.
I don't like to use smart contract if they are not needed. And I want to spend less gas as possible, so MOM transactions acts like this:

- `from`: `MUST` be the tx signer
- `to`: `MUST` be the tx signer
- `value`: `MUST` be 0 wei
- `data`: `MUST` be at least 1 byte. First byte is the code for operation. Then it comes the content.

### MOM v.1.0 - List of standard message types (WIP)

| CODE | PARAMETERS | MEANING 			|
|:--------:|------------|-------------------|
| 00       | multihash  | Add a message. The parameter is the multihash of the content. Content default is Markdown text in UTF8 without BOM |
| 01       | multihash, multihash | Update a message. The first parameter is the message to be updated. The second parameter is the multihash of the updated message |
| 02	   | multihash | Delete a message identified by the specified multihash |
| 03       | multihash, multihash | Reply to a message. The first parameter is the message to reply to. The second parameter is the multihash of the message
| FE	   | Any | Custom MOM specifications
| FF	   | Any | Raw content, no need to disclose the meaning. General client can ignore it.

**DELETE** command? Yeah, it's like: I changed my mind so please ÐApps don't show this anymore, unless expressly asked by the user of course, and if the content is still available, of course.

Why [multihash](https://github.com/multiformats/multihash)? Because it is flexible, future-proof and there are already a tons of library supporting it.

### Don't like default specifications, just choose yours
FE - Define your own specification. If you encounter FE again, you read the next byte to know the message type, and so on..
If you find FE it means user want to define it's own MOM specifications and meaning.

#### MOM Smart Contract - V1 specification, list of codes, ecc
If you don't like the standard code list, you need to deploy the specification that works for yourself. You can use the MOM Factory (WIP) if you prefer, but it's not mandatory.

## How to contribute or develop your own _MOM-enabled_ ÐApp

Clone the repository with:

```bash
$ git clone https://github.com/Neurone/mom.git
$ cd mom
$ npm install
$ npm start
```

### Dealing with line endings
https://help.github.com/en/articles/dealing-with-line-endings

## VSCode plugins
I develop with VSCode and in particular these plugins are used that affect source code formatting:
- Beautify ([hookyqr.beautify](https://marketplace.visualstudio.com/items?itemName=HookyQR.beautify))
- ESLint ([dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint))
- EditorConfig for VS Code ([editorconfig.editorconfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig))
