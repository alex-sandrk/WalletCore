'use strict';

// const LumerinContracts = require('metronome-contracts');
const LumerinContracts = require('lumerin-contracts');

const socketsMetaParser = ({ returnValues }) => ({
  lumerin: {
    sockets: true
  },
  returnedValue: returnValues.refund
});

function getEventDataCreator (chain) {
  const {
    abi,
    address: contractAddress,
    birthblock: minBlock
  } = LumerinContracts[chain].Auctions;

  return [
    address => ({
      abi,
      contractAddress,
      eventName: 'LogSocketsIn',
      filter: { sender: address },
      metaParser: socketsMetaParser,
      minBlock
    })
  ];
}

module.exports = {
  // getEventDataCreator,
  // socketsMetaParser
};
