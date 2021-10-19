'use strict'

const { utils: { toHex } } = require('web3')
// const LumerinContracts = require('metronome-contracts')
const LumerinContracts = require('lumerin-contracts')

// const { getExportMetFee } = require('./porter-api')

function estimateExportLmrGas (web3, chain) {
  const { LMRToken } = new LumerinContracts(web3, chain);
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

    return LMRToken.methods.export(
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
  const { LMRToken } = new LumerinContracts(web3, chain);
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

    return LMRToken.methods.importLMR(
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
  const { LMRToken } = new LumerinContracts(web3, chain)
  return function (privateKey, { gasPrice, gas, from, to, value }) {
    addAccount(web3, privateKey)
    return getNextNonce(web3, from)
      .then(nonce =>
        logTransaction(
          LMRToken.methods.transfer(to, value)
            .send({ from, gasPrice, gas, nonce }),
          from,
          metaParsers.transfer({
            address: LMRToken.options.address,
            returnValues: { _from: from, _to: to, _value: value }
          })
        )
      )
  }
}

function exportLmr (web3, chain, logTransaction, metaParsers) {
  const { LMRToken } = new LumerinContracts(web3, chain)
  return function (privateKey, params) {
    const {
      destinationChain,
      destinationLmrAddress,
      extraData,
      fee,
      from,
      gas,
      gasPrice,
      to,
      value
    } = params;
    addAccount(web3, privateKey);

    return Promise.all([
      getNextNonce(web3, from),
      // fee || getExportLmrFee(web3, chain)({ value })
      fee
    ])
      .then(([nonce, actualFee]) =>
        logTransaction(
          LMRToken.methods.export(
            toHex(destinationChain),
            destinationLmrAddress,
            to || from,
            value,
            actualFee,
            extraData
          ).send({ from, gasPrice, gas, nonce }),
          from,
          metaParsers.export({
            address: from,
            returnValues: {
              amountToBurn: value,
              destinationChain: toHex(destinationChain),
              destinationRecipientAddr: to || from,
              fee: actualFee
            }
          })
        )
      )
  }
}

function importLmr (web3, chain, logTransaction, metaParsers) {
  const { LMRToken } = new LumerinContracts(web3, chain);
  return function (privateKey, params) {
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
      gas,
      gasPrice,
      originChain,
      previousBurnHash,
      supply,
      root,
      value
    } = params;
    addAccount(web3, privateKey);

    return Promise.all([
      getNextNonce(web3, from)
    ])
      .then(([nonce]) =>
        logTransaction(
          LMRToken.methods.importLMR(
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
          ).send({ from, gasPrice, gas, nonce }),
          from,
          metaParsers.importRequest({
            returnValues: {
              amountToImport: value,
              currentBurnHash,
              fee,
              originChain: toHex(originChain),
              destinationRecipientAddr: from
            }
          })
        )
      )
  }
}

module.exports = {
  estimateExportLmrGas,
  estimateImportLmrGas,
  exportLmr,
  importLmr,
  sendLmr
}
