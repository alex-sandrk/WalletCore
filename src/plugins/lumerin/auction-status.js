'use strict'

const createLumerinStatus = require('metronome-sdk-status')
const LumerinContracts = require('metronome-contracts')

function getAuctionStatus (web3, chain) {
  const contracts = new LumerinContracts(web3, chain)
  const lumerinStatus = createLumerinStatus(contracts)

  return lumerinStatus
    .getAuctionStatus()
    .then(
      ({
        currAuction,
        currentAuctionPrice,
        genesisTime,
        minting,
        nextAuctionTime
      }) => ({
        currentAuction: Number.parseInt(currAuction),
        currentPrice: currentAuctionPrice,
        genesisTime,
        nextAuctionStartTime: nextAuctionTime,
        tokenRemaining: minting
      })
    )
}

module.exports = getAuctionStatus
