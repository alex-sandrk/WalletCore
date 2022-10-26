'use strict'

const { debounce, groupBy, merge, noop, reduce } = require('lodash')
const debug = require('debug')('lmr-wallet:core:explorer:queue')
const getTransactionStatus = require('./transaction-status')
const promiseAllProps = require('promise-all-props')
const abi = require('../token/erc20-abi.json');

function createQueue(config, eventBus, web3) {
  debug.enabled = config.debug

  const metasCache = {}

  let pendingEvents = []

  function mergeEvents(hash, events) {
    const metas = events.map(({ event, metaParser }) => metaParser(event))

    metas.unshift(metasCache[hash] || {})

    metasCache[hash] = reduce(metas, merge)

    return metasCache[hash]
  }

  const mergeDones = (events) => events.map((event) => event.done || noop)

  function fillInStatus({ transaction, receipt, meta }) {
    if (receipt && meta) {
      meta.contractCallFailed = !getTransactionStatus(transaction, receipt)
    }
    return { transaction, receipt, meta }
  }

  function decodeInput({ transaction, receipt, meta }) {
    if (typeof transaction.input === 'string') {
      const decoded = web3.eth.abi.decodeParameters(
        abi.find(a => a.name === 'transfer').inputs,
        transaction.input.slice(10)
      )
      const to = decoded['0'];
      const amount = decoded['1']
      transaction.input = {
        to,
        amount
      }
      return { transaction, receipt, meta }
    }
    return { transaction, receipt, meta }
  }

  function emitTransactions(address, transactions) {
    eventBus.emit('wallet-transactions-changed', {
      transactions: transactions
        .filter((data) => !!data.transaction)
        .map(fillInStatus)
        .map(decodeInput),
    })

    eventBus.emit('token-transactions-changed', {
      transactions: transactions
        .filter((data) => !!data.transaction)
        .map(fillInStatus)
        .map(decodeInput),
    })

    Promise.all([eventBus.emit('eth-tx'), eventBus.emit('lmr-tx')])
  }

  function tryEmitTransactions(address, transactions) {
    try {
      emitTransactions(address, transactions)
      return null
    } catch (err) {
      return err
    }
  }

  function emitPendingEvents(address) {
    debug('About to emit pending events')

    const eventsToEmit = pendingEvents.filter((e) => e.address === address)
    const eventsToKeep = pendingEvents.filter((e) => e.address !== address)
    pendingEvents = eventsToKeep

    const grouped = groupBy(eventsToEmit, 'event.transactionHash')

    Promise.all(
      Object.keys(grouped).map((hash) =>
        promiseAllProps({
          transaction: web3.eth.getTransaction(hash),
          receipt: web3.eth.getTransactionReceipt(hash),
          meta: mergeEvents(hash, grouped[hash]),
          done: mergeDones(grouped[hash]),
        })
      )
    )
      .then(function (transactions) {
        const err = tryEmitTransactions(address, transactions)
        return Promise.all(
          transactions.map((transaction) =>
            Promise.all(transaction.done.map((done) => done(err)))
          )
        )
      })
      .catch(function (err) {
        eventBus.emit('wallet-error', {
          inner: err,
          message: 'Could not emit event transaction',
          meta: { plugin: 'explorer' },
        })
        eventsToEmit.forEach(function (event) {
          event.done(err)
        })
      })
  }

  const debouncedEmitPendingEvents = debounce(
    emitPendingEvents,
    config.explorerDebounce
  )

  const addTransaction = (address, meta) =>
    function (hash) {
      debug('Queueing transaction', hash)

      return new Promise(function (resolve, reject) {
        const event = {
          address,
          event: { transactionHash: hash },
          metaParser: () => meta || {},
          done: (err) => (err ? reject(err) : resolve()),
        }
        pendingEvents.push(event)

        debouncedEmitPendingEvents(address)
      })
    }

  const addEvent = (address, metaParser) =>
    function (event) {
      debug('Queueing event', event.event)
      return new Promise(function (resolve, reject) {
        pendingEvents.push({
          address,
          event,
          metaParser,
          done: (err) => (err ? reject(err) : resolve()),
        })
        debouncedEmitPendingEvents(address)
      })
    }

  return {
    addEvent,
    addTransaction,
  }
}

module.exports = createQueue
