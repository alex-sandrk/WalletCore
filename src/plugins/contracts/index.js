'use strict';

const debug = require('debug')('lmr-wallet:core:contracts');
const Web3 = require('web3');

const { getActiveContracts, createContract, cancelContract } = require('./api');

/**
 * Create a plugin instance.
 *
 * @returns {({ start: Function, stop: () => void})} The plugin instance.
 */
function createPlugin () {
  /**
   * Start the plugin instance.
   *
   * @param {object} options Start options.
   * @returns {{ events: string[] }} The instance details.
   */
  function start ({ config, eventBus, plugins }) {
    const { chainId } = config;
    const { eth } = plugins;
    const web3 = new Web3(eth.web3Provider);

    const refreshContracts = (web3, chainId) => {
      eventBus.emit('contracts-scan-started', {});

      return getActiveContracts(web3, chainId)
        .then((contracts) => {
          console.log('----------------------------------------   ', { contracts })
          eventBus.emit('contracts-scan-finished', {
            actives: contracts
          });
        })
        .catch(function (error) {
          logger.warn('Could not sync contracts/events', error.stack);
          return {};
        });
    }

    return {
      api: {
        refreshContracts: refreshContracts(web3, chainId),
        createContract: createContract(web3, chainId),
        cancelContract: cancelContract(web3, chainId)
      },
      events: [
        'contracts-scan-started',
        'contracts-scan-finished'
      ],
      name: 'contracts'
    };
  }

  /**
   * Stop the plugin instance.
   */
  function stop () {
    debug('Plugin stopping');
  }

  return {
    start,
    stop
  };
}

module.exports = createPlugin;
