const _ = require('lodash');
// const InfoHandler = require('./InfoHandler');
const DBHandler = require('./DBHandler');
const config = require('./config');
const Promise = require('bluebird');
const BetPlacingHandler = require('./BetPlacingHandler');
// const MatchingHandler = require('./MatchingHandler')
const messagingBase = require('./messagingBase');

class BetPlacingController extends messagingBase{
  constructor() {
    super();
    this.betPlacingHandler = new BetPlacingHandler();
    this.messagingName = 'BetPlacingController';
    this.DBHandler = new DBHandler();
  }

  setConfig(inConfig) {
    this.config = inConfig;
    return Promise.resolve(true);
  }

  async init() {
    console.log('BetPlacingController->init');
    this.isReady = false;
    this.betPlacingHandler.setDBHandler(new DBHandler());
    await this.betPlacingHandler.init();
    console.log('finish init');
    return Promise.resolve(true);
    
  }
  async start() {
    console.log('BetPlacingController->start');

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
    return this.betPlacingHandler.start();
  }

  static async kickstart() {
    const pc = new BetPlacingController();
    pc.setConfig(config.controller);
    pc.listenerName = 'BetPlacingController';
    pc.isListenerMode = true;
    await pc.listen();
  }
}

module.exports = BetPlacingController;
BetPlacingController.kickstart();
