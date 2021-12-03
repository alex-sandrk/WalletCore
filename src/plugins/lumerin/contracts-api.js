'use strict'

const { MerkleTree } = require('merkletreejs');
const crypto = require('crypto');
const { utils: { toHex, BN, toBN } } = require('web3')
// const LumerinContracts = require('metronome-contracts')
const LumerinContracts = require('@lumerin/contracts')

// const { getExportLmrFee } = require('./porter-api')

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
      .then(calcMerkleRoot)
}

function getExportLmrFee (web3, chain) {
  const { TokenPorter } = new LumerinContracts(web3, chain)
  return ({ value }) =>
    Promise.all([
      TokenPorter.methods.minimumExportFee().call().then(fee => toBN(fee)),
      TokenPorter.methods.exportFee().call().then(fee => toBN(fee))
    ])
      .then(([minFee, exportFee]) =>
        BN.max(minFee, exportFee.mul(toBN(value)).divn(10000)).toString()
      )
}

function estimateExportLmrGas (web3, chain) {
  const { Lumerin } = new LumerinContracts(web3, chain);
  return function (params) {
    const {
      destinationChain,
      destinationLmrAddress,
      extraData,
      fee,
      from,
      to,
      value
    } = params;

    return Lumerin.methods.export(
      toHex(destinationChain),
      destinationLmrAddress,
      to || from,
      value,
      fee,
      extraData
    ).estimateGas({ from });
  }
}

function estimateImportLmrGas (web3, chain) {
  const { Lumerin } = new LumerinContracts(web3, chain);
  return function (params) {
    const {
      blockTimestamp,
      burnSequence,
      currentBurnHash,
      currentTick,
      dailyMintable,
      destinationChain,
      destinationLmrAddress,
      extraData,
      fee,
      from,
      originChain,
      previousBurnHash,
      supply,
      root,
      value
    } = params;

    return Lumerin.methods.importLMR(
      toHex(originChain),
      toHex(destinationChain),
      [destinationLmrAddress, from],
      extraData,
      [previousBurnHash, currentBurnHash],
      supply,
      [
        blockTimestamp,
        value,
        fee,
        currentTick,
        dailyMintable,
        burnSequence
      ],
      root
    ).estimateGas({ from });
  }
}

function addAccount (web3, privateKey) {
  web3.eth.accounts.wallet.create(0)
    .add(web3.eth.accounts.privateKeyToAccount(privateKey));
}

const getNextNonce = (web3, from) =>
  web3.eth.getTransactionCount(from, 'pending')

function sendLmr (web3, chain, logTransaction, metaParsers) {
  const { Lumerin } = new LumerinContracts(web3, chain)
  return function (privateKey, { gasPrice, gas, from, to, value }) {
    addAccount(web3, privateKey)
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
      )
  }
}

// function exportLmr (web3, chain, logTransaction, metaParsers) {
//   const { Lumerin } = new LumerinContracts(web3, chain)
//   return function (privateKey, params) {
//     const {
//       destinationChain,
//       destinationLmrAddress,
//       extraData,
//       fee,
//       from,
//       gas,
//       gasPrice,
//       to,
//       value
//     } = params;
//     addAccount(web3, privateKey);

//     return Promise.all([
//       getNextNonce(web3, from),
//       fee || getExportLmrFee(web3, chain)({ value })
//     ])
//       .then(([nonce, actualFee]) =>
//         logTransaction(
//           Lumerin.methods.export(
//             toHex(destinationChain),
//             destinationLmrAddress,
//             to || from,
//             value,
//             actualFee,
//             extraData
//           ).send({ from, gasPrice, gas, nonce }),
//           from,
//           metaParsers.export({
//             address: from,
//             returnValues: {
//               amountToBurn: value,
//               destinationChain: toHex(destinationChain),
//               destinationRecipientAddr: to || from,
//               fee: actualFee
//             }
//           })
//         )
//       )
//   }
// }

// function importLmr (web3, chain, logTransaction, metaParsers) {
//   const { Lumerin } = new LumerinContracts(web3, chain);
//   return function (privateKey, params) {
//     const {
//       blockTimestamp,
//       burnSequence,
//       currentBurnHash,
//       currentTick,
//       dailyMintable,
//       destinationChain,
//       destinationLmrAddress,
//       extraData,
//       fee,
//       from,
//       gas,
//       gasPrice,
//       originChain,
//       previousBurnHash,
//       supply,
//       root,
//       value
//     } = params;
//     addAccount(web3, privateKey);

//     return Promise.all([
//       getNextNonce(web3, from)
//     ])
//       .then(([nonce]) =>
//         logTransaction(
//           Lumerin.methods.importLMR(
//             toHex(originChain),
//             toHex(destinationChain),
//             [destinationLmrAddress, from],
//             extraData,
//             [previousBurnHash, currentBurnHash],
//             supply,
//             [
//               blockTimestamp,
//               value,
//               fee,
//               currentTick,
//               dailyMintable,
//               burnSequence
//             ],
//             root
//           ).send({ from, gasPrice, gas, nonce }),
//           from,
//           metaParsers.importRequest({
//             returnValues: {
//               amountToImport: value,
//               currentBurnHash,
//               fee,
//               originChain: toHex(originChain),
//               destinationRecipientAddr: from
//             }
//           })
//         )
//       )
//   }
// }

module.exports = {
  // getExportLmrFee,
  getMerkleRoot,
  // estimateExportLmrGas,
  // estimateImportLmrGas,
  // exportLmr,
  // importLmr,
  sendLmr
}
