'use strict'

const LumerinContracts = require('metronome-contracts')

const attestationMetaParser = ({ returnValues }) => ({
  lumerin: {
    attestation: {
      currentBurnHash: returnValues.hash,
      isValid: returnValues.isValid
    }
  }
})

function getEventDataCreator (chain) {
  const {
    abi,
    address: contractAddress,
    birthblock: minBlock
  } = LumerinContracts[chain].Validator

  return [
    address => ({
      contractAddress,
      abi,
      eventName: 'LogAttestation',
      filter: { recipientAddr: address },
      metaParser: attestationMetaParser,
      minBlock
    })
  ]
}

module.exports = {
  getEventDataCreator
}
