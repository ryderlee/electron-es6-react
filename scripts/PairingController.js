const _ = require('lodash');
// const InfoHandler = require('./InfoHandler');
const DBHandler = require('./DBHandler');
const config = require('./config');
const Promise = require('bluebird');
const RedisAutoParingHandler = require('./RedisAutoParingHandler');
// const MatchingHandler = require('./MatchingHandler')


const messagingBase = require('./messagingBase');
const connectionStore = {};
connectionStore.isn = require('./providers/isn');
// const Isn = require('./providers/isn');
connectionStore.pinbet= require('./providers/pinbet');
connectionStore.sbo = require('./providers/sbo');

const BettingOdds = require('./providers/bettingOdds');

// connectionStore['maxbet'] = require('./providers/maxbet')

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

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

    /*
    let isn = new connectionStore['isn']();
    this.connections['isn'] = isn;
    console.log(_.size(this.connections));
    _.each(this.connections, (value, key) => {
      console.log("key:%s" , key);
      this.connections[key].start();
    });
    */
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
