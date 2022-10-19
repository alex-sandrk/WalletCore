const { CGMinerApi } = require('../cgminer-api')
const { Status } = require('../consts')

const { ConfigurationStrategyInterface } = require('./strategy.interface')

/**
 * @class
 * @implements {ConfigurationStrategyInterface}
 */
class TcpConfigurationStrategy {
  constructor(host, abort) {
    this.host = host
    this.abort = abort
  }

  /**
   * @returns {Promise<Boolean>}
   */
  async isAvailable() {
    const api = new CGMinerApi()
    await api.connect({ host: this.host, abort: this.abort })
    return api.hasPrivilegedAccess()
  }

  /**
   * Adds new pool to configuration and set highest priority
   *
   * @param {String} pool
   * @param {String} poolUser
   * @returns {Promise<boolean>} Returns true if successfully updated configuration
   */
  async setPool(pool, poolUser) {
    try {
      const api = new CGMinerApi()
      await api.connect({ host: this.host, abort: this.abort })

      const result = await api.addPool(pool, poolUser)
      const status = result.STATUS[0].STATUS
      if (status !== Status.Success) {
        return false
      }
      if (!api.isSocketOpen()) {
        await api.reconnect()
      }
      const { id } = result
      const data = await api.switchPool(id)
      if (data.STATUS[0].STATUS !== Status.Success) {
        return false
      }
      return true
    } catch (err) {
      console.log(err)
      return false
    }
  }
}

module.exports = { TcpConfigurationStrategy }
