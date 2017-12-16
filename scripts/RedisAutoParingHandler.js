'use strict'

const messagingBase = require('./messagingBase');

const _ = require('lodash');
const similarity = require('string-similarity');
const jaro= require('jaro-winkler');
const clj_fuzzy = require('clj-fuzzy');
const querystring = require('querystring');
const Promise = require('bluebird');
const moment = require('moment');
// const GoogleSearch = require('google-search');
const google = require('googleapis');
const Firestore = require('@google-cloud/firestore');
const axios = require('axios');

// const shremote = requireTaskPool(global.require.resolve('./StrategyHandlerRemote'))

class RedisAutoPairingHandler {
  constructor() {
    this.config = {};
    this.monitorConn = null;
    this.conn = null;
    this.SOTLeague = {};
    this.SOTEvent = {};
    this.eventListForPairing = {};
    this.matchedLeagueCache = {};
    this.matchedEventCache = {};
    // this.googleSearch = new GoogleSearch({ key: 'AIzaSyD--ThlYnbnM1p9qCzfSEkRw8exq71XDcs', cx: '006149041960462827544:zpky3uc3qmq' });
    this.googleSearch = google.customsearch('v1');
    this.axios = axios.create({baseURL: 'https://www.googleapis.com/' });
    this.firestore = new Firestore({
      projectId: 'valid-shine-187515',
      keyFilename: '../key/wavymap-sports.json',
    });
    this.googlingArr = {};
    this.googledResult = {};
  }


  isReady(){
    return true;
  }
  setConfig(config) {
  }

  setDBHandler (ph) {
    this.DBHandler = ph;
  }

  async loadContentFromStore() {
    await this.firestore.collection('googledResult').get().then((qs) => {
      _.each(qs.docs, (doc) => {
        this.googledResult[querystring.unescape(doc.id)] = doc.data().links;
      });
    });
    this.matchedEventCache = await this.firestore.collection('matchedEvent').get();
    this.matchedLeagueCache = await this.firestore.collection('matchedLeague').get();

  }

  async createObjToStore(collection, keyword, obj) {
    console.log('createObjToStore %s %s', collection, keyword);
    return this.firestore.collection(collection).doc(querystring.escape(keyword)).set(obj);
  }

  async removeObjFromStore(collection, keyword) {
    console.log('removeObjFromStore');
    return this.firestore.collection(collection).doc(querystring.escape(keyword)).delete();
  }
  async updateObjFromStore(collection, keyword, obj) {
    console.log('updateObjFromStore');
    return this.createObjToStore(collection, keyword, obj);
  }

  async init() {
    this.monitorConn = this.DBHandler.getNewConnection();
    this.conn = this.DBHandler.getNewConnection();
    await this.loadContentFromStore();
    return Promise.resolve(true);
  }
  async loadContent(connPattern) {
    const keys = await this.conn.keys(connPattern);
    const pipe = this.conn.pipeline();
    _.each(keys, key => pipe.hgetall(key));
    const resultObjs = await pipe.exec();
    const returnValue = {};
    _.each(resultObjs, resultObj => returnValue[resultObj[1].id] = resultObj[1]);
    return Promise.resolve(returnValue);
    // console.log(result);
  }

  
  async onUpdateSOTLeagueMessageReceived(message) {
    const messageDigested = this.DBHandler.consumeMessage(message);
    if (messageDigested.command === 'set') {
      if (!_.has(this.SOTLeague, messageDigested.content)) {
        const tmp = await this.conn.hgetall(messageDigested.content);
        this.proceedPairingInfo(tmp);
      }
    } 
  }

  async onUpdateSOTEventMessageReceived(message) {
    const messageDigested = this.DBHandler.consumeMessage(message);
    if (messageDigested.command === 'set') {
      if (!_.has(this.SOTEvent, messageDigested.content)) {
        const tmp = await this.conn.hgetall(messageDigested.content);
        this.proceedPairingInfo(tmp);
      }
    } 
  }

  async onUpdateEventMessageReceived(message) {
    const md = this.DBHandler.consumeMessage(message);
    if (md.command === 'set') {
      const eventObj = await this.conn.hgetall(md.content);
      if (!_.has(this.eventListForPairing, eventObj.providerCode)) this.eventListForPairing[eventObj.providerCode] = {};
      this.eventListForPairing[eventObj.providerCode][md.content] = eventObj;
      await this.proceedPairingInfo(eventObj);
    }
  }

  async onUpdateLeagueMessageReceived(message) {
    const md = this.DBHandler.consumeMessage(message);
    if (md.command === 'set') {
      const leagueObj = await this.conn.hgetall(md.content);
      await this.proceedPairingInfo(leagueObj);
    }
  }

  async proceedPairing(keyword, obj) {
    const inObjArr = (_.isArray(obj) ? obj : [obj]);
    const promiseArr = [];
    _.each(inObjArr, (inObj) => {
      if (!_.has(inObj, 'pairingInfo')) inObj.pairingInfo = {};
      if (_.has(inObj, 'objType')) {
        switch (inObj.objType) {
          case 'l':
            promiseArr.push(this.matchLeague(inObj));
            break;
          case 'sotl':
            this.SOTLeague[inObj.id] = inObj;
            break;
          case 'e':
            promiseArr.push(this.matchEvent(inObj));
            break;
          case 'sote':
            this.SOTEvent[inObj.id] = inObj;
            break;
          default:
        }
      } else {
        console.log('proceedPairing: something wrong');
        console.log(inObj);
        console.log(obj);
      }
    });
    return Promise.all(promiseArr);
  }
  
  async proceedGoogleSearch(keyword, obj) {
    // console.log('submitGoogleSearch %s', keyword);


    if (_.has(this.googledResult, keyword)) {
      console.log('proceedGoogleSearch: loadCache : %s', keyword);
      obj.pairingInfo.googledResult = this.googledResult[keyword];
      this.proceedPairing(keyword, obj);

    } else if (!_.has(this.googlingArr, keyword)) {
      //new search
      console.log('proceedGoogleSearch: new cache: %s', keyword);
      this.googlingArr.keyword = [];
      this.googlingArr.keyword.push(obj);
      console.log(this.googlingArr.keyword);
      const requestResult = await this.axios.get('/customsearch/v1', { params: { key: 'AIzaSyD--ThlYnbnM1p9qCzfSEkRw8exq71XDcs', cx: '002761999912980462279:cvtlm1njr4u', q: keyword, num: 3 } });
      const result = _.map(requestResult.data.items, 'link');
      await this.createObjToStore('googledResult', keyword, { links: result });
      console.log('proceedGoogleSearch: keyword=%s', keyword);
      console.log(this.googlingArr);
      console.log(this.googlingArr[keyword]);
      await this.proceedPairing(keyword, this.googlingArr[keyword]);
      delete this.googlingArr[keyword];
    } else {
      console.log('submitGoogleSearch: searching: %s', keyword);
      this.googlingArr.keyword.push(obj);
    }
  }
  async proceedPairingInfo(obj) {
    const inObj = _.clone(obj);
    let keyword = null;
    if (!_.has(obj, 'pairingInfo')) inObj.pairingInfo = {};
    switch (obj.objType) {
      case 'l':
      case 'sotl':
        keyword = obj.leagueName;
        inObj.pairingInfo.soundexIndex = clj_fuzzy.phonetics.soundex(keyword);
        await this.proceedGoogleSearch(keyword, inObj);
        break;
      case 'e':
      case 'sote':
        keyword = `${obj.homeTeamName} - ${obj.awayTeamName}`;
        inObj.pairingInfo.soundexIndex = clj_fuzzy.phonetics.soundex(keyword);
        await this.proceedPairing(keyword, inObj);
        break;
      default:
        keyword = null;
        console.log('proceedPairingInfo:something wrong');
        console.log(obj);
    }
    if (_.isUndefined(keyword)) {
      console.log('something wrong');
      console.log(obj);
    }
  }


  oneToManyEventMatching (eventObj, rightEventArr) {
    console.log('oneToManEventMatching : %s', rightEventArr.length);
    const eventObjDatetime = moment(eventObj.eventDatetime);
    const resultArr = _.map(rightEventArr, (o) => {

      const SOTEventDatetime = moment(o.eventDatetime);
      const diff = eventObjDatetime.diff(SOTEventDatetime);
      if (diff < 86400000 && diff > -86400000) {
        const homeTeamCLJ = clj_fuzzy.metrics.jaro(eventObj.homeTeamName, o.homeTeamName);
        const awayTeamCLJ = clj_fuzzy.metrics.jaro(eventObj.awayTeamName, o.awayTeamName);
        if(!_.has(o, 'pairingInfo')) o.pairingInfo = {};
        o.pairingInfo.homeTeamCLJ = homeTeamCLJ;
        o.pairingInfo.awayTeamCLJ = awayTeamCLJ;
        o.pairingInfo.totalCLJ = homeTeamCLJ + awayTeamCLJ;
        o.pairingInfo.homeTeamMetaphone = similarity.compareTwoStrings(clj_fuzzy.phonetics.metaphone(eventObj.homeTeamName), clj_fuzzy.phonetics.metaphone(o.homeTeamName));
        o.pairingInfo.awayTeamMetaphone = similarity.compareTwoStrings(clj_fuzzy.phonetics.metaphone(eventObj.awayTeamName), clj_fuzzy.phonetics.metaphone(o.awayTeamName));
        o.pairingInfo.totalMetaphone = o.pairingInfo.homeTeamMetaphone + o.pairingInfo.awayTeamMetaphone;
        if ((homeTeamCLJ > 0.7 && awayTeamCLJ > 0.7) || homeTeamCLJ > 0.8 || awayTeamCLJ > 0.8) {
          return o;
        }
        // return (clj_fuzzy.metrics.jaro(eventObj.homeTeamName, o.homeTeamName) > 0.5 && clj_fuzzy.metrics.jaro(eventObj.awayTeamName, o.awayTeamName) > 0.5);
      }


    });
    return _.orderBy(_.compact(resultArr), [o => o.pairingInfo.totalCLJ, o => o.pairingInfo.totalMetaphone], ['desc', 'desc']);
  }

  async matchEvent(eventObj) {
    console.log('matchEvent----');
    const eventObjDatetime = moment(eventObj.eventDatetime);
    let eventToMatchArr = {};
    let matchedEventArr = [];
    let somethingToMatch = false;
    _.each(this.eventListForPairing, async (value, key) => {
      // console.log(value);
      if (key !== eventObj.providerCode) {
        somethingToMatch = true;
        const result = this.oneToManyEventMatching(eventObj, _.values(value));
        matchedEventArr = _.concat(matchedEventArr, result);
      }
    });
    if(somethingToMatch) {
      console.log(eventObj);
      if (matchedEventArr.length > 0) {
        if (matchedEventArr.length === 1) {
          await this.DBHandler.setEventGroup(eventObj, matchedEventArr[0]);
          console.log('match added');
        } else {
          console.log('matching count:%s', matchedEventArr.length);
          console.log(matchedEventArr.slice(0, 3));
        }
      } else {
        console.log('NOT FOUND');
      }
    } else {

    }
    /*
    _.each(this.SOTEvent, async (SOTEventObj) => {
      const googleSimilarity = similarity.compareTwoStrings(SOTLeagueObj.pairingInfo.googledResult[0].htmlTitle, leagueObj.pairingInfo.googledResult[0].htmlTitle);
      const soundexIndex =similarity.compareTwoStrings(SOTLeagueObj.soundexIndex, leagueObj.soundexIndex); 
      const jaroIndex =jaro(SOTLeagueObj.leagueName, leagueObj.leagueName);
      const similarityIndex =similarity.compareTwoStrings(SOTLeagueObj.leagueName, leagueObj.leagueName); 
      const cljIndex =clj_fuzzy.metrics.sorensen(SOTLeagueObj.leagueName, leagueObj.leagueName);
      result.push({
        SOTProviderCode: SOTLeagueObj.providerCode,
        SOTLeagueCode: SOTLeagueObj.leagueCode,
        SOTLeagueName: SOTLeagueObj.leagueName,
        providerCode: leagueObj.providerCode,
        leagueName: leagueObj.leagueName,
        leagueCode: leagueObj.leagueCode,
        similarity: similarityIndex,
        google: googleSimilarity,
        jaro: jaroIndex,
        clj: cljIndex,
        soundex: soundexIndex,
        total: similarityIndex + jaroIndex + cljIndex + soundexIndex,
      });
    });
    console.log('-----------match--------------');
    const pickedResult = [];
    let sortedResult = _.orderBy(result, ['soundex', 'similarity', 'total', 'jaro'], ['desc', 'desc', 'desc', 'desc']);
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    sortedResult = _.orderBy(sortedResult, ['similarity', 'soundex', 'total', 'jaro'], ['desc', 'desc', 'desc', 'desc']);
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    sortedResult = _.orderBy(sortedResult, ['total', 'jaro', 'clj'], ['desc', 'desc', 'desc']);
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    sortedResult = _.orderBy(sortedResult, ['jaro', 'total', 'clj'], ['desc', 'desc', 'desc']);
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    sortedResult = _.orderBy(sortedResult, ['clj', 'total', 'clj'], ['desc', 'desc', 'desc']);
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    console.log(pickedResult.slice(0,2));
    const topSOTLeagueObj = sortedResult[0];
    const eventArr = await this.loadContent(`obj:e#p:${leagueObj.providerCode}#l:${querystring.escape(leagueObj.leagueCode)}*`);
    const SOTEventArr = await this.loadContent(`obj:sote#p:${topSOTLeagueObj.providerCode}#l:${querystring.escape(topSOTLeagueObj.leagueCode)}*`);
    console.log('------------------event');
    console.log(`obj:sote#p:${topSOTLeagueObj.providerCode}#l:${querystring.escape(topSOTLeagueObj.leagueCode)}*`);
    console.log(_.sortBy(eventArr, 'eventDatetime').slice(0, 1));
    console.log(_.sortBy(SOTEventArr, 'eventDateTime').slice(0, 1));
    */
  }
  async matchLeague (leagueObj) {
    /*
    const result = [];

    _.each(this.SOTLeague, async (SOTLeagueObj) => {
      const googleSimilarity = similarity.compareTwoStrings(SOTLeagueObj.pairingInfo.googledResult[0].htmlTitle, leagueObj.pairingInfo.googledResult[0].htmlTitle);
      const soundexIndex =similarity.compareTwoStrings(SOTLeagueObj.soundexIndex, leagueObj.soundexIndex); 
      const jaroIndex =jaro(SOTLeagueObj.leagueName, leagueObj.leagueName);
      const similarityIndex =similarity.compareTwoStrings(SOTLeagueObj.leagueName, leagueObj.leagueName); 
      const cljIndex =clj_fuzzy.metrics.sorensen(SOTLeagueObj.leagueName, leagueObj.leagueName);
      result.push({
        SOTProviderCode: SOTLeagueObj.providerCode,
        SOTLeagueCode: SOTLeagueObj.leagueCode,
        SOTLeagueName: SOTLeagueObj.leagueName,
        providerCode: leagueObj.providerCode,
        leagueName: leagueObj.leagueName,
        leagueCode: leagueObj.leagueCode,
        similarity: similarityIndex,
        google: googleSimilarity,
        jaro: jaroIndex,
        clj: cljIndex,
        soundex: soundexIndex,
        total: similarityIndex + jaroIndex + cljIndex + soundexIndex,
      });
    });
    console.log('-----------match--------------');
    const pickedResult = [];
    let sortedResult = _.orderBy(result, ['soundex', 'similarity', 'total', 'jaro'], ['desc', 'desc', 'desc', 'desc']);
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    sortedResult = _.orderBy(sortedResult, ['similarity', 'soundex', 'total', 'jaro'], ['desc', 'desc', 'desc', 'desc']);
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    sortedResult = _.orderBy(sortedResult, ['total', 'jaro', 'clj'], ['desc', 'desc', 'desc']);
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    sortedResult = _.orderBy(sortedResult, ['jaro', 'total', 'clj'], ['desc', 'desc', 'desc']);
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    sortedResult = _.orderBy(sortedResult, ['clj', 'total', 'clj'], ['desc', 'desc', 'desc']);
    pickedResult.push(sortedResult.shift());
    pickedResult.push(sortedResult.shift());
    console.log(pickedResult.slice(0,2));
    const topSOTLeagueObj = sortedResult[0];
    const eventArr = await this.loadContent(`obj:e#p:${leagueObj.providerCode}#l:${querystring.escape(leagueObj.leagueCode)}*`);
    const SOTEventArr = await this.loadContent(`obj:sote#p:${topSOTLeagueObj.providerCode}#l:${querystring.escape(topSOTLeagueObj.leagueCode)}*`);
    console.log('------------------event');
    console.log(`obj:sote#p:${topSOTLeagueObj.providerCode}#l:${querystring.escape(topSOTLeagueObj.leagueCode)}*`);
    console.log(_.sortBy(eventArr, 'eventDatetime').slice(0, 1));
    console.log(_.sortBy(SOTEventArr, 'eventDateTime').slice(0, 1));
    */
  }

  async loadSOTContent() {
    const leagueArr = await this.loadContent('obj:sotl*');
    if (!_.isNull(leagueArr) && !_.isUndefined(leagueArr)) {
      _.each(leagueArr, async (leagueObj) => {
        await this.proceedPairingInfo(leagueObj);
      });
    }

    const eventArr = await this.loadContent('obj:sote*');
    if (!_.isNull(eventArr) && !_.isUndefined(eventArr)) this.SOTEvent = eventArr;
    // this.matchedLeagueGroup = await this.loadList('list:matchedl*');
    // this.matchedEventGroup = await this.loadList('list:matchede*');
    // this.matchedLeagueCache = await this.loadMatchedContent('');
    // this.matchedEventCache = await this.loadMatchedContent('');
  }

  async processOnce() {
    /*
    console.log('processOnce');
    const leagueArr = await this.loadContent('obj:l#*');
    if (!_.isNull(leagueArr) && (_.size(leagueArr) > 0)) {
      await Promise.map(_.values(leagueArr), async leagueObj => this.matchLeague(leagueObj));
    }
    */
    return Promise.resolve(true);

  }


  async monitor() {
    console.log('autoPairing->monitor');
    await this.monitorConn.subscribe('objUpdate_league', 'objUpdate_event', 'objUpdate_SOTLeague', 'objUpdate_SOTEvent');
    
    this.monitorConn.on('message', async (channel, message) => {
      switch (channel) {
        case 'objUpdate_league':
          await this.onUpdateLeagueMessageReceived(message);
          break;
        case 'objUpdate_event':
          await this.onUpdateEventMessageReceived(message);
          break;
        case 'objUpdate_SOTLeague':
          await this.onUpdateSOTLeagueMessageReceived(message);
          break;
        case 'objUpdate_SOTEvent':
          this.onUpdateSOTEventMessageReceived(message);
          break;
        default:
          break;
      }
    });
    console.log('autoPairing->monitor done');
    return Promise.resolve(true);
  }





  async start() {
    console.log('autoPairing->start');
    return this.monitor();
  }
}
module.exports = RedisAutoPairingHandler;