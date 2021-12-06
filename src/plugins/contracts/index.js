'use strict';

// const { getExchangeRate } = require('safe-exchange-rate');
const debug = require('debug')('lmr-wallet:core:rates');

// const createStream = require('./stream');

/**
 * Create a plugin instance.
 *
 * @returns {({ start: Function, stop: () => void})} The plugin instance.
 */
function createPlugin () {
  let dataStream;

  /**
   * Start the plugin instance.
   *
   * @param {object} options Start options.
   * @returns {{ events: string[] }} The instance details.
   */
  function start ({ config, eventBus }) {

    return {
      events: [],
      name: 'contracts'
    };
  }

  /**
   * Stop the plugin instance.
   */
  function stop () {
    debug('Plugin stopping');

    dataStream.destroy();
  }

  return {
    start,
    stop
  };
}

module.exports = createPlugin;
