'use strict';

const { MerkleTree } = require('merkletreejs');
const crypto = require('crypto');
const { utils: { toHex, BN, toBN } } = require('web3')
const LumerinContracts = require('@lumerin/contracts')

const sha256 = data => crypto.createHash('sha256').update(data).digest();

function calcMerkleRoot (hashes) {
  const leaves = hashes.map(x => Buffer.from(x.slice(2), 'hex'));
  const tree = new MerkleTree(leaves, sha256);

  return `0x${tree.getRoot().toString('hex')}`;
}

function getMerkleRoot (web3, chain) {
  // const { TokenPorter } = new LumerinContracts(web3, chain)
  return burnSeq =>
    Promise.all(new Array(16).fill()
      .map((_, i) => toBN(burnSeq).subn(i))
      .filter(seq => seq.gten(0))
      .reverse()
      // .map(seq => TokenPorter.methods.exportedBurns(seq.toString()).call())
    )
      .then(calcMerkleRoot);
}

const addAccount = (web3, privateKey) => web3.eth.accounts.wallet.create(0)
  .add(web3.eth.accounts.privateKeyToAccount(privateKey));

const getNextNonce = (web3, from) => web3.eth.getTransactionCount(from, 'pending')

const sendLmr = (web3, chain, logTransaction, metaParsers) => {
  const { Lumerin } = new LumerinContracts(web3, chain);

  return (privateKey, { gasPrice, gas, from, to, value }) => {
    addAccount(web3, privateKey);

    return getNextNonce(web3, from)
      .then(nonce =>
        logTransaction(
          Lumerin.methods.transfer(to, value)
            .send({ from, gasPrice, gas, nonce }),
          from,
          metaParsers.transfer({
            address: Lumerin.options.address,
            returnValues: { _from: from, _to: to, _value: value }
          })
        )
      );
  };
}

module.exports = {
  getMerkleRoot,
  sendLmr
};
