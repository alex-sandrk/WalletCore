'use strict'

const axios = require('axios')
const EventEmitter = require('events')
const LumerinContracts = require('@lumerin/contracts')

class Explorer {
  constructor({ chainId, web3 }) {
    switch (chainId.toString()) {
      case 'mainnet':
      case '1':
        this.apiUrl = 'https://api.etherscan.io/api'
        break
      case 'ropsten':
      case '3':
        this.apiUrl = 'https://api-ropsten.etherscan.io/api'
        break
      default:
        throw new Error(`Unsupported chain ${chainId}`)
    }
    this.api = axios.create({
      baseURL: this.apiUrl,
    })
    this.chainId = chainId
    this.web3 = web3
  }

  async getTransactions(from, to, address) {
    const { Lumerin } = LumerinContracts[this.chainId]

    const params = {
      module: 'account',
      action: 'tokentx',
      sort: 'desc',
      contractaddress: Lumerin.address,
      startBlock: from,
      endBlock: to,
      address,
    }

    const { data } = await this.api.get('/', { params })
    const { status, message, result } = data
    if (status !== '1' && message !== 'No transactions found') {
      throw new Error(result)
    }
    return result.map((transaction) => transaction.hash)
  }

  /**
   * Create a stream that will emit an event each time a transaction for the
   * specified address is indexed.
   *
   * The stream will emit `data` for each transaction. If the connection is lost
   * or an error occurs, an `error` event will be emitted.
   *
   * @param {string} address The address.
   * @returns {object} The event emitter.
   */
  getTransactionStream(address) {
    const stream = new EventEmitter()

    const { Lumerin } = LumerinContracts[this.chainId]

    const contract = new this.web3.eth.Contract(Lumerin.abi, Lumerin.address)

    contract.events
      .Transfer({
        filter: {
          to: address,
        },
      })
      .on('data', (data) => {
        const { transactionHash } = data
        stream.emit('data', transactionHash)
      })
      .on('error', (err) => {
        stream.emit('error', err);
      })
    return stream
  }

  getLatestBlock() {
    return this.web3.eth.getBlock('latest').then(function (block) {
      return {
        number: block.number,
        hash: block.hash,
        totalDifficulty: block.totalDifficulty,
      }
    })
  }
}

module.exports = Explorer
