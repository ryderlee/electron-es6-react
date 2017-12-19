// const InfoHandler = require('./InfoHandler');
const DBHandler = require('./DBHandler');
const config = require('./config');
const Promise = require('bluebird');
const RedisAutoParingHandler = require('./RedisAutoParingHandler');
// const MatchingHandler = require('./MatchingHandler')
const messagingBase = require('./messagingBase');

// connectionStore['maxbet'] = require('./providers/maxbet')

class PairingController extends messagingBase {
  constructor() {
    super();
    this.autoPairingHandler = new RedisAutoParingHandler();
    this.messagingName = 'PairingController';
    this.DBHandler = new DBHandler();
  }

  setConfig(inConfig) {
    this.config = inConfig;
    return Promise.resolve(true);
  }

  async init() {
    console.log('PairingController->init');
    this.isReady = false;
    this.autoPairingHandler.setDBHandler(new DBHandler());
    await this.autoPairingHandler.init();
    await this.autoPairingHandler.processOnce();
    console.log('finish init');
    return Promise.resolve(true);
  }
  async start() {
    console.log('ConnectionController->start');

    // console.log(this.connections);
    return this.autoPairingHandler.start();
  }

  static async kickstart() {
    const pc = new PairingController();
    pc.setConfig(config.controller);
    pc.listenerName = 'PairingController';
    pc.isListenerMode = true;
    await pc.listen();
  }
}

module.exports = PairingController;
PairingController.kickstart();
