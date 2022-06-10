'use strict'

const debug = require('debug')('lmr-wallet:core:contracts:api');
const LumerinContracts = require('@lumerin/contracts')

async function _getContractAddresses (web3, chain) {
  const { CloneFactory } = new LumerinContracts(web3, chain);

  return await CloneFactory.methods.getContractList().call()
    .catch(error => {
      debug('Error when trying get list of contract addresses from CloneFactory contract: ', error);
    });
}

async function _loadContractInstance(web3, chain, instanceAddress) {
  const implementationContract = await new web3.eth.Contract(LumerinContracts[chain].Implementation.abi, instanceAddress);

  return await implementationContract.methods.getPublicVariables().call()
    .then((contract) => {
      const {
        0: state,
        1: price, // cost to purchase the contract
        2: limit, // max th provided
        3: speed, // th/s of contract
        4: length, // duration of the contract in seconds
        5: timestamp, // timestamp of the block at moment of purchase
        6: buyer, // wallet address of the purchasing party
        7: seller, // wallet address of the selling party
        8: encryptedPoolData // encrypted data for pool target info
      } = contract;

      return {
        id: instanceAddress,
        price,
        speed,
        length,
        buyer,
        seller,
        timestamp,
        state,
        encryptedPoolData
      };
    })
    .catch(error => {
      debug('Error when trying to load Contracts by address in the Implementation contract: ', error);
    });
}

async function getActiveContracts(web3, chain) {
  if(!web3) {
    debug('Not a valid Web3 instance');
    return;
  }
  const addresses = await _getContractAddresses(web3, chain);

  let activeContracts = [];
  for(let i = 0; i < addresses.length; i++) {
    let inst = await _loadContractInstance(web3, chain, addresses[i]);
    activeContracts.push(inst);
  }

  return activeContracts;
}

function createContract(web3, chain, plugins) {
  if (!web3) {
    debug('Not a valid Web3 instance');
    return;
  }

  const { CloneFactory } = new LumerinContracts(web3, chain);

  return async function (params) {
    const { gasPrice } = await plugins.wallet.getGasPrice();
    console.log("gas price: ", gasPrice);
    const { price, limit = 0, speed, duration, sellerAddress, validatorAddress = "0x0000000000000000000000000000000000000000" } = params;

    console.log("sending with gas... ", { price, limit, speed, duration, validatorAddress, sellerAddress });
plugins.wallet.ensureAccount()
    return web3.eth.getTransactionCount(sellerAddress, 'pending')
      .then(nonce =>
        plugins.explorer.logTransaction(
          CloneFactory.methods.setCreateNewRentalContract(price, limit, speed, duration, validatorAddress).send({
            from: sellerAddress,
            gas: 8000000,
            gasPrice,
            nonce
          }, function (data, err) {
            console.log("error: ", err);
            console.log("data: ", data);
          }),
          sellerAddress
        )
      );

    return CloneFactory.methods.setCreateNewRentalContract(price, limit, speed, duration, validatorAddress).send({
      from: sellerAddress,
      gas: 8000000,
    }, function (data, err) {
      console.log("error: ", err);
      console.log("data: ", data);
    })
      .then((receipt) => {
        debug("receipt: ", receipt);
        return receipt;
      })
      .catch(error => {
        debug('Error when trying to create contract: ', error);
      });
  }
}

// function updateContract(web3, chain) {
//   if(!web3) {
//     debug('Not a valid Web3 instance');
//     return;
//   }

//   return function(params) {
//     // const { Implementation } = LumerinContracts(web3, chain)
//     //   .createContract(LumerinContracts[chain].Implementation.abi, address);
//     const implementationContract = _loadContractInstance(web3, chain, address);
//     const isRunning = implementationContract.contractState() === 'Running';

//     if(isRunning) {
//       debug("Contract is currently in the 'Running' state");
//       return;
//     }

//     implementationContract.methods.setUpdatePurchaseInformation()
//   }
// }

function cancelContract(web3, chain) {
  if(!web3) {
    debug('Not a valid Web3 instance');
    return;
  }

  return function(params) {
    const { walletAddress, gasLimit = 1000000, contractId: address } = params;
    const implementationContract = _loadContractInstance(web3, chain, address);
    const isRunning = implementationContract.contractState() === 'Running';

    if(isRunning) {
      debug("Contract is currently in the 'Running' state");
      return;
    }

    return implementationContract.methods.setContractCloseOut(3)
    .send({ from: walletAddress, gas: gasLimit })
    .then((receipt) => receipt);
  }
}

module.exports = {
  getActiveContracts,
  createContract,
  cancelContract
};
