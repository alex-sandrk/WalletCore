'use strict';

const debug = require('debug')('lmr-wallet:core:proxy-router');
const Web3 = require('web3');

const createConnectionManager = require('./connections-manager');

function createPlugin () {
  let connectionManager;

  function start ({ config, eventBus }) {
    debug.enabled = config.debug;

    debug('Initiating proxy-router connections stream');
    connectionManager = createConnectionManager(config, eventBus);

    const refreshConnections = () => connectionManager.getConnectionsStream()
      .on('data', function(data) {
        eventBus.emit('proxy-router-connections-changed', {
          connections: data.connections
        });
    });

    // Non-websocket api call to get Connections
    // const cxns = connectionManager.getConnections()
    // if(cxns) {
    //   eventBus.emit('proxy-router-connections-changed', {
    //     cxns
    //   });
    // }


    return {
      api: {
        refreshConnections: refreshConnections()
        // getConnections: connectionManager.getConnections(),
        // getConnectionsStream: connectionManager.getConnectionsStream()
      },
      events: [
        'proxy-router-connections-changed',
        'proxy-router-status-changed',
        'proxy-router-error'
      ],
      name: 'proxy-router'
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
