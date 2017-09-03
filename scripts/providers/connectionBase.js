class connectionBase {
  constructor() {
    this.DBHandler = null;
    this.providerCode = null;
  }
  setDBHandler (ph) {
    this.DBHandler = ph;
  }
  setProviderKey (key) {
    this.providerKey = key;
  }
  setConfig (config) {
    this.config = config;
  }
}
// let exa = ReactDOM.render(<Example />, document.getElementById('content2'))
module.exports = connectionBase;
