'use strict';

const { CookieJar } = require('tough-cookie');
const { create: createAxios } = require('axios');
const { default: axiosCookieJarSupport } = require('axios-cookiejar-support');
const debug = require('debug')('lmr-wallet:core:explorer:connection-manager');
const EventEmitter = require('events');
const io = require('socket.io-client');
const pRetry = require('p-retry');

/**
 * Create an object to interact with the Lumerin indexer.
 *
 * @param {object} config The configuration object.
 * @param {object} eventBus The corss-plugin event bus.
 * @returns {object} The exposed indexer API.
 */
function createConnectionsManager (config, eventBus) {
  const { debug: enableDebug, useNativeCookieJar } = config;
  const { PROXY_ROUTER_BASE_URL } = process.env;

  debug.enabled = enableDebug;

  let axios;
  let jar;
  let socket;

  if (useNativeCookieJar) {
    axios = createAxios({
      baseURL: "http://" + PROXY_ROUTER_BASE_URL
    });
  } else {
    jar = new CookieJar();
    axios = axiosCookieJarSupport(createAxios(({
      baseURL: "http://" + PROXY_ROUTER_BASE_URL,
      withCredentials: true
    })));
    axios.defaults.jar = jar;
  }

  const getConnections = () =>
    axios("/connections")
      .then(res => res.data);

  const getSocket = () => io("ws://" + PROXY_ROUTER_BASE_URL + "/ws", {
      autoConnect: true,
      extraHeaders: jar
        ? { Cookie: jar.getCookiesSync("ws://" + PROXY_ROUTER_BASE_URL + "/ws").join(';') }
        : {}
    });

  const getCookiePromise = useNativeCookieJar
    ? Promise.resolve()
    : pRetry(
      () =>
        getConnections()
          .then(function () {
            debug('Got connections stream cookie')
          }),
        () => {},
      {
        forever: true,
        maxTimeout: 5000,
        onFailedAttempt (err) {
          debug('Failed to get connections stream cookie', err.message)
        }
      }
    );



  /**
   * Create a stream that will emit an event each time a connection is published to the proxy-router
   *
   * The stream will emit `data` for each connection. If the proxy-router connection is lost
   * or an error occurs, an `error` event will be emitted. In addition, when the
   * connection is restablished, a `resync` will be emitted.
   *
   * @returns {object} The event emitter.
   */
  function getConnectionsStream () {
    const stream = new EventEmitter();
    // TODO: remove dummy data

    getCookiePromise
      .then(function () {
        socket = getSocket();

        socket.on('connect', function () {
          debug('Connection manager connected to proxy-router');
          eventBus.emit('proxy-router-status-changed', {
            isConnected: true
          });
          socket.emit('subscribe', { type: 'cxns' },
            function (err) {
              if (err) {
                stream.emit('error', err)
              }
            }
          )
        });

        socket.on('cxns', function (data) {
          if (!data) {
            stream.emit('error', new Error('Indexer sent no tx event data'));
            return;
          }

          const { type, connections } = data;

          if (type === 'cxns') {
            if (typeof connections !== 'Array') {
              stream.emit('error', new Error('Connections Manager sent bad cxns event data'));
              return;
            }

            stream.emit('data', { connections });
          }
        });

        socket.on('disconnect', function (reason) {
          debug('Indexer disconnected');
          eventBus.emit('proxy-router-status-changed', {
            connected: false
          });
          stream.emit('error', new Error(`Indexer disconnected with ${reason}`));
        })

        socket.on('reconnect', function () {
          stream.emit('resync');
        });

        socket.on('error', function (err) {
          stream.emit('error', err);
        });

        socket.open();
      })
      .catch(function (err) {
        stream.emit('error', err);
      });

    return stream;
  }

  /**
   * Disconnects.
   */
  function disconnect () {
    if (socket) {
      socket.close();
    }
  }

  return {
    disconnect,
    getConnections,
    getConnectionsStream
  };
}

module.exports = createConnectionsManager;
