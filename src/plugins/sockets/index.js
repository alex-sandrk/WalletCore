'use strict';

const debug = require('debug')('lmr-wallet:core:sockets');
const Web3 = require('web3');

const createConnectionManager = require('./connection-manager');

function createPlugin () {
  let connectionManager;

  function start ({ config, eventBus, plugins }) {
    debug.enabled = config.debug;

    connectionManager = createConnectionManager(config);

    debug('Initiating blocks stream');
    // blocksStream = createStream(web3);
    // blocksStream.on('data', function ({ hash, number, timestamp }) {
    //   debug('New block', hash, number);
    //   eventBus.emit('coin-block', { hash, number, timestamp });
    // });
    // blocksStream.on('error', function (err) {
    //   debug('Could not get latest block');
    //   eventBus.emit('wallet-error', {
    //     inner: err,
    //     message: 'Could not get latest block',
    //     meta: { plugin: 'explorer' }
    //   });
    // });

    return {
      api: {
        getConnections: connectionManager.getConnections(),
        getConnectionsStream: connectionManager.getConnectionsStream()
        // logTransaction: createLogTransaction(queue),
        // refreshAllTransactions: syncer.refreshAllTransactions,
        // refreshTransaction: refreshTransaction(web3, eventsRegistry, queue),
        // registerEvent: eventsRegistry.register,
        // syncTransactions: syncer.syncTransactions,
        // tryParseEventLog: tryParseEventLog(web3, eventsRegistry)
      },
      events: [
        'socket-connections-status-changed',
        'wallet-error'
      ],
      name: 'sockets'
    };
  }

  function stop () {
    connectionManager.disconnect();
  }

  return {
    start,
    stop
  };
}

module.exports = createPlugin;
