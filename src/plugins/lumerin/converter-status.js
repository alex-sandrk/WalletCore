'use strict'

const createLumerinStatus = require('metronome-sdk-status')
const LumerinContracts = require('metronome-contracts')

function getConverterStatus (web3, chain) {
  const contracts = new LumerinContracts(web3, chain)
  const lumerinStatus = createLumerinStatus(contracts)

  return lumerinStatus
    .getConverterStatus()
    .then(({ currentConverterPrice, coinBalance, metBalance }) => ({
      availableMet: metBalance,
      availableCoin: coinBalance,
      currentPrice: currentConverterPrice
    }))
}

module.exports = getConverterStatus
