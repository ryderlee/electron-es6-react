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
  }

  init() {
    if(this.config.proxy.enableProxy) {
      this.axios = axios.create({
        proxy: this.config.proxy.proxySetting,
      });
    } else {
      this.axios = axios.create();
    }
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
}
// let exa = ReactDOM.render(<Example />, document.getElementById('content2'))
module.exports = connectionBase;
