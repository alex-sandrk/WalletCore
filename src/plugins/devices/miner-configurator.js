const {
  ConfigurationStrategyFactory,
} = require('./configuration-strategies/factory')

/**
 * Adds new pool to configuration and set highest priority
 * @param {string} host
 * @param {string} poolUrl
 * @param {AbortSignal} abort 
 * @param {(data: Object) => void} onUpdate
 * @returns {Promise<void>}
 */
const setPool = async (host, poolUrl, abort, onUpdate) => {
  const strategy = await ConfigurationStrategyFactory.createStrategy(
    host,
    abort
  )
  if (!strategy) {
    throw new Error('No available configuration strategy')
  }
  const poolUser = `proxy.${host.split('.').slice(-2).join('.')}`
  const result = await strategy.setPool(poolUrl, poolUser)
  return result
    ? onUpdate({
        host,
        poolAddress: poolUrl,
        isDone: true,
        poolUser,
      })
    : onUpdate({
        host,
        isDone: true,
      })
}

module.exports = { setPool }
