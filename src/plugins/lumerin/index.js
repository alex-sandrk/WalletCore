'use strict';

const debug = require('debug')('lmr-wallet:core:lumerin');
// const LumerinContracts = require('metronome-contracts');
const LumerinContracts = require('lumerin-contracts');
const Web3 = require('web3');

// const {
//   buyMet,
//   estimateAuctionGas
// } = require('./auction-api')
// const {
//   convertCoin,
//   convertMet,
//   estimateCoinToMetGas,
//   estimateMetToCoinGas,
//   getCoinToMetEstimate,
//   getMetToMetEstimate
// } = require('./converter-api')
const {
  // getExportMetFee,
  // getMerkleRoot
} = require('./porter-api');
const {
  estimateExportLmrGas,
  estimateImportLmrGas,
  exportLmr,
  importLmr,
  sendLmr
} = require('./token-api');
// const auctionEvents = require('./auction-events')
// const converterEvents = require('./converter-events')
// const getAttestationThreshold = require('./validator-status')
// const getAuctionStatus = require('./auction-status')
// const getChainHopStartTime = require('./porter-status');
// const getConverterStatus = require('./converter-status')
const porterEvents = require('./porter-events');
// const validatorEvents = require('./validator-events.js')

/**
 * Creates an instance of the Lumerin plugin.
 *
 * @returns {{start:Function,stop:Function}} The plugin top-level API.
 */
function createPlugin () {
  /**
   * Start the plugin.
   *
   * @param {object} params The start parameters.
   * @param {object} params.config The configuration options.
   * @param {object} params.eventBus The cross-plugin event emitter.
   * @param {object} params.plugins All other plugins.
   * @returns {{api:object,events:string[],name:string}} The plugin API.
   */
  function start ({ config, eventBus, plugins }) {
    debug.enabled = config.debug;

    const { chainId, gasOverestimation } = config;
    const { eth, explorer, tokens } = plugins;

    const web3 = new Web3(eth.web3Provider);

    // Register LMR token
    tokens.registerToken(LumerinContracts[chainId].Lumerin.address, {
      decimals: 8,
      name: 'Lumerin',
      symbol: 'LMR'
    });

    // Register all LMR events
    const events = [];
    events
      // .concat(auctionEvents.getEventDataCreator(chainId))
      // .concat(converterEvents.getEventDataCreator(chainId))
      // .concat(porterEvents.getEventDataCreator(chainId))
      // .concat(validatorEvents.getEventDataCreator(chainId))
      .forEach(explorer.registerEvent);

    // Start emitting LMR status
    const emitLumerinStatus = () =>
      Promise.all([
        // getAuctionStatus(web3, chainId)
        //   .then(function (status) {
        //     eventBus.emit('auction-status-updated', status)
        //   }),
        // getConverterStatus(web3, chainId)
        //   .then(function (status) {
        //     eventBus.emit('converter-status-updated', status)
        //   }),
        // getAttestationThreshold(web3, chainId)
        //   .then(function (status) {
        //     eventBus.emit('attestation-threshold-updated', status)
        //   }),
        // getChainHopStartTime(web3, chainId)
        //   .then(function (status) {
        //     eventBus.emit('chain-hop-start-time-updated', status)
        //   })
      ])
        .catch(function (err) {
          eventBus.emit('wallet-error', {
            inner: err,
            message: 'Lumerin status could not be retrieved',
            meta: { plugin: 'lumerin' }
          });
        });

    emitLumerinStatus();

    eventBus.on('coin-block', emitLumerinStatus);

    // Collect meta parsers
    const metaParsers = Object.assign(
      {
        // auction: auctionEvents.auctionMetaParser,
        // converter: converterEvents.converterMetaParser,
        export: porterEvents.exportMetaParser,
        import: porterEvents.importMetaParser,
        importRequest: porterEvents.importRequestMetaParser
      },
      tokens.metaParsers
    );

    // Define gas over-estimation wrapper
    const over = fn =>
      (...args) =>
        fn(...args).then(gas =>
          ({ gasLimit: Math.round(gas * gasOverestimation) })
        )

    // Build and return API
    return {
      api: {
        // buyLumerin: buyMet(
        //   web3,
        //   chainId,
        //   explorer.logTransaction,
        //   metaParsers
        // ),
        // convertCoin: convertCoin(
        //   web3,
        //   chainId,
        //   explorer.logTransaction,
        //   metaParsers
        // ),
        // convertMet: convertMet(
        //   web3,
        //   chainId,
        //   explorer.logTransaction,
        //   metaParsers
        // ),
        // getExportMetFee: getExportMetFee(web3, chainId),
        // getMerkleRoot: getMerkleRoot(web3, chainId),
        estimateExportLmrGas: over(estimateExportLmrGas(web3, chainId)),
        estimateImportLmrGas: over(estimateImportLmrGas(web3, chainId)),
        exportLmr: exportLmr(
          web3,
          chainId,
          explorer.logTransaction,
          metaParsers
        ),
        // getAuctionGasLimit: over(estimateAuctionGas(web3, chainId)),
        // getConvertCoinEstimate: getCoinToMetEstimate(web3, chainId),
        // getConvertCoinGasLimit: over(estimateCoinToMetGas(web3, chainId)),
        // getConvertMetEstimate: getMetToMetEstimate(web3, chainId),
        // getConvertMetGasLimit: over(estimateMetToCoinGas(web3, chainId)),
        importLmr: importLmr(
          web3,
          chainId,
          explorer.logTransaction,
          metaParsers
        ),
        sendLmr: sendLmr(
          web3,
          chainId,
          explorer.logTransaction,
          metaParsers
        )
      },
      events: [
        // 'attestation-threshold-updated',
        // 'auction-status-updated',
        // 'chain-hop-start-time-updated',
        // 'converter-status-updated',
        'wallet-error'
      ],
      name: 'lumerin'
    };
  }

  /**
   * Stop the plugin.
   */
  function stop () {}

  return {
    start,
    stop
  };
}

module.exports = createPlugin;
