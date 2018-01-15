const axios = require('axios');

class connectionBase {
  constructor() {
    this.DBHandler = null;
    this.providerCode = null;
    this.username = null;
    this.password = null;
    this.providerKey = null;
    this.config = null;
    this.axios = null;
    this.isAvailableForBetting = false;
    this.isBetting = false;
  }
  getNewConnection() {
    if (this.config.proxy.enableProxy) {
      this.axios = axios.create({
        proxy: this.config.proxy.proxySetting,
        timeout: 3000,
      });
    } else {
      this.axios = axios.create({ timeout: 3000 });
    }
  }
  init() {
    this.getNewConnection();
  }
  setDBHandler(ph) {
    this.DBHandler = ph;
  }
  setProviderKey(key) {
    this.providerKey = key;
  }
  setConfig(config) {
    this.config = config;
  }
  getUniqueCode() {
    return this.providerKey;
  }
}
// let exa = ReactDOM.render(<Example />, document.getElementById('content2'))
module.exports = connectionBase;
