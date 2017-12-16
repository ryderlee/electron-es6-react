const _ = require('lodash');
// const InfoHandler = require('./InfoHandler');
const DBHandler = require('./DBHandler');
const config = require('./config');
const Promise = require('bluebird');
const RedisAutoParingHandler = require('./RedisAutoParingHandler');
// const MatchingHandler = require('./MatchingHandler')

const connectionStore = {};
connectionStore.isn = require('./providers/isn');
// const Isn = require('./providers/isn');
connectionStore.pinbet= require('./providers/pinbet');
connectionStore.sbo = require('./providers/sbo');

const BettingOdds = require('./providers/bettingOdds');




class MainController {
  constructor() {
    this.DBHandler = new DBHandler();
    this.isReadyArr = {};
    return true;
  }




  setConfig(inConfig) {
    this.config = inConfig;
    return Promise.resolve(true);
  }
  // eslint-disable-next-line class-methods-use-this
  isAllMessageReceived(arr, ...controllers) {
    return _.every(controllers, controller => _.has(arr, controller))
      && _.every(controllers, controller => arr[controller]);
  }
  async monitorReady() {
    if (!this.isAllMessageReceived(this.isReadyArr, 'ConnectionController', 'PairingController')) {
      await this.DBHandler.publish('general', 'confirmReady ConnectionController', 'confirmReady PairingController');
    }
    if (!this.isAllMessageReceived(this.isReadyArr, 'ConnectionController', 'PairingController')) _.delay(_.bind(this.monitorReady, this), 1000);
  }
  // eslint-disable-next-line class-methods-use-this
  async sendMessageToMultiRecipients(command, ...recipients) {
    const pipe = this.DBHandler.redis.pipeline();
    _.each(recipients, (recipient) => {
      pipe.publish(command, recipient);
    });
    return pipe.exec();
  }

  async start() {
    const callback = (channel, message) => {
      const md = this.DBHandler.consumeMessage(message);
      switch (md.command) {
        case 'isReady':
          this.isReadyArr[md.content] = true;
          if (this.isAllMessageReceived(this.isReadyArr, 'ConnectionController', 'PairingController')) {
            this.sendMessageToMultiRecipients('init', 'ConnectionController', 'PairingController');
          }
          break;
        case 'isInited':
          this.isInitArr[md.content] = true;
          if (this.isAllMessageReceived(this.isInitArr, 'ConnectionController', 'PairingController')) {
            this.sendMessageToMultiRecipients('start', 'ConnectionController', 'PairingController');
          }
          break;
        default:
      }
    };
    this.DBHandler.subscribe('general', callback);

    await this.DBHandler.publish('general', 'start ConnectionController');
    await this.DBHandler.publish('general', 'start PairingController');
    // await this.DBHandler.publish('general', 'start OddsController');
  }
  async kickstart() {
    this.setConfig(config.controller);
    await this.start();
  }
}

module.exports = PairingController;
const pc = new PairingController();
pc.kickstart();
