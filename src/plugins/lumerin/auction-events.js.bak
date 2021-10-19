'use strict'

const LumerinContracts = require('metronome-contracts')

const auctionMetaParser = ({ returnValues }) => ({
  lumerin: {
    auction: true
  },
  returnedValue: returnValues.refund
})

function getEventDataCreator (chain) {
  const {
    abi,
    address: contractAddress,
    birthblock: minBlock
  } = LumerinContracts[chain].Auctions

  return [
    address => ({
      abi,
      contractAddress,
      eventName: 'LogAuctionFundsIn',
      filter: { sender: address },
      metaParser: auctionMetaParser,
      minBlock
    })
  ]
}

module.exports = {
  getEventDataCreator,
  auctionMetaParser
}
