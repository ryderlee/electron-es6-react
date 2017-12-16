const _ = require('lodash');
const DBHandler = require('./DBHandler');

class messagingBase {
  constructor() {
    this.isListenerMode = false;
    this.status = null;
    this.listenerName = null;
    return true;
  }
  async monitorMessaging(channelName, myHandlerName, ...functions) {
    const errorCallback = async (err, count) => {
      if (!_.isNull(err)) console.log(err);
    };

    const messageCallback = async (channel, message) => {
      if (channel === channelName && message === `start ${myHandlerName}`) {
        await this.start();
      }
    };
    return this.DBHandler.subscribe(...functions, errorCallback, messageCallback);
  }
  async monitorForStart(channelName, myHandlerName) {
    return this.monitorMessaging(channelName, myHandlerName, 'start');
  }
  setListenerName(name) {
    this.listenerName = name;
  }

  async readyMode(channelName) {
    if (this.status === 'ready') {
      _.delay(_.bind(this.readyMode, this), 3000, channelName);
      this.publishStatusMessage('general', 'isReady');
    }

  }
  async listen() {
    this.status = 'ready';
    await this.responseCommandMessage('general', ['start', 'init']);
    return this.readyMode('general');
  }
  async publishStatusMessage(channelName, status) {
    return this.publishMessage(channelName, `${status} ${this.listenerName}`);
  }

  async publishMessage(channelName, message) {
    return this.DBHandler.publish(channelName, message);
  }

  async responseCommandMessage(channelName, commandArr) {
    const redis = DBHandler.getNewConnection();
    await redis.subscribe(channelName, (err, count) => {});
    await redis.on('message', (channel, inMessage) => {
      if (channel === channelName) {
        const message = this.DBHandler.consumeMessage(inMessage);
        if (_.includes(commandArr, message.command) && message.content === this.listenerName) this[`${message.command}MessageReceived`]();
      }
    });
  }
  async initMessageReceived() {
    this.status = 'init';
    await this.init();
    if (this.isListenerMode) await this.publishStatusMessage('general', 'isInited');
    return Promise.resolve(true);
  }

  async startMessageReceived() {
    this.status = 'start';
    await this.start();
    if (this.isListenerMode) await this.publishStatusMessage('general', 'isStarted');
    return Promise.resolve(true);
  }
}

module.exports = messagingBase;
