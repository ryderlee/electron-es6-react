const _ = require('lodash');
// const InfoHandler = require('./InfoHandler');
const DBHandler = require('./DBHandler');
const config = require('./config');
const Promise = require('bluebird');
const SureBetHandler = require('./SureBetHandler');
// const MatchingHandler = require('./MatchingHandler')


const messagingBase = require('./messagingBase');

// connectionStore['maxbet'] = require('./providers/maxbet')

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

class SureBetController extends messagingBase {
  constructor() {
    super();
    this.sureBetHandler = new SureBetHandler();
    this.messagingName = 'SureBetController';
    this.DBHandler = new DBHandler();
  }

 


  setConfig(inConfig) {
    this.config = inConfig;
    return Promise.resolve(true);
  }

  async init() {
    console.log('SureBetController->init');
    this.isReady = false;
    this.sureBetHandler.setDBHandler(new DBHandler());
    await this.sureBetHandler.init();
    await this.sureBetHandler.processOnce();
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
    return this.sureBetHandler.start();
  }

  static async kickstart() {
    const pc = new SureBetController();
    pc.setConfig(config.controller);
    pc.listenerName = 'SureBetController';
    pc.isListenerMode = true;
    await pc.listen();
  }
}

module.exports = SureBetController;
SureBetController.kickstart();
