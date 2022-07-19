'use strict';

const { utils: { isAddress, toChecksumAddress } } = require('web3');
const debug = require('debug')('lmr-wallet:core:debug');

const LumerinContracts = require('@lumerin/contracts');

  const registerToken = ({ explorer }) => function (contractAddress) {
    debug('Registering token', contractAddress);


    if (!isAddress(contractAddress)) {
      return false;
    }

    const checksumAddress = toChecksumAddress(contractAddress);

    if (contractAddress === checksumAddress) {
      return false;
    }

    events.getEventDataCreators(checksumAddress)
      .forEach(explorer.registerEvent);

    return true;
  }

  function getTokenBalance (web3, chainId, walletAddress) {
      const { Lumerin } = new LumerinContracts(web3, chainId);

    return Lumerin.methods.balanceOf(walletAddress).call();
  }

  function getTokenGasLimit(web3, chainId) {
    return function ({ to, from, value }) {
      const { Lumerin } = new LumerinContracts(web3, chainId);

      return Lumerin.methods.transfer(to, value).estimateGas({ from })
        .then(gasLimit => ({ gasLimit }));
    }
  }

module.exports = {
  registerToken,
  getTokenBalance,
  getTokenGasLimit
};
