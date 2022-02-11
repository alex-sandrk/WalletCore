'use strict';

const LumerinContracts = require('@lumerin/contracts');

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

// Approves claimant contract to transfer LMR tokens on the Lumerin Contract's behalf
const increaseAllowance = (web3, chain, claimantAddress, lmrAmount, walletAddress, gasLimit = 1000000) => {
  const { Lumerin } = new LumerinContracts(web3, chain);

  return Lumerin.methods.increaseAllowance(claimantAddress, lmrAmount)
    .send({ from: walletAddress, gas: gasLimit });
}

module.exports = {
  increaseAllowance,
  sendLmr
};
