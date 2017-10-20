
const _ = require('lodash');
const Redis = require('ioredis');
const utils = Redis.utils;
const Promise = require('bluebird');
const querystring = require('querystring');
Redis.Command.setReplyTransformer('hgetall', (result) => {
  if (Array.isArray(result)) {
    var obj = {};
    for (var i = 0; i < result.length; i += 2) {
      obj[result[i]] = result[i + 1];
    }
    return obj;
  }
  return result;
});
Redis.Command.setArgumentTransformer('hmset', (args) => {
  if (args.length === 2) {
    if (typeof Map !== 'undefined' && args[1] instanceof Map) {
      // utils is a internal module of ioredis
      return [args[0]].concat(utils.convertMapToArray(args[1]));
    }
    if ( typeof args[1] === 'object' && args[1] !== null) {
      let arr = [];
      _.each(args[1], (value, key) => {
        arr.push(key);
        arr.push(String(value));
      });
      // return [args[0]].concat(utils.convertObjectToArray(args[1]));
      return [args[0]].concat(arr);
    }
  }
  return args;
});

// const app = require('electron').app

class InfoHandler {
  constructor() {
    this.redis = new Redis();
    this.leagueCollection = null;
    this.eventCollection = null;
    this.teamCollection = null;
    this.gameCollection = null;
    this.oddsCollection = null;
    this.leagueGroupCollection = null;
    this.leagueBuff = [];
    this.eventBuff = [];
    this.teamBuff = [];
    this.gameBuff = [];
    this.oddsBuff = [];
    this.leagueGroupBuff = [];
    this.config = {};

    this.leagueUpdateCallbacks = [];
    this.leagueGroupUpdateCallbacks = [];
    this.eventUpdateCallbacks = [];
    this.eventGroupUpdateCallbacks = [];
    this.gameUpdateCallbacks = [];
    this.oddsUpdateCallbacks = [];

    this.gamePeriodMap = { 0: '1', 1: '2', 2: '3' }; //0: Game, 1: 1st half, 2: 2nd half
    this.gameTeamMap = { all: '1',
      home: '2',
      away: '3',
    };
    this.gameTypeMap = { handicap: {
      '0.00': '1000',
      '0.25': '1001',
      '0.50': '1002',
      '0.75': '1003',
      '1.00': '1004',
      '1.25': '1005',
      '1.50': '1006',
      '1.75': '1007',
      '2.00': '1008',
      '2.25': '1009',
      '2.50': '1010',
      '2.75': '1011',
      '3.00': '1012',
      '3.25': '1013',
      '3.50': '1014',
      '3.75': '1015',
      '4.00': '1016',
      '4.25': '1017',
      '4.50': '1018',
      '4.75': '1019',
      '5.00': '1020',
      '5.25': '1021',
      '5.50': '1022',
      '5.75': '1023',
      '6.00': '1024',
      '6.25': '1025',
      '6.50': '1026',
      '6.75': '1027',
      '7.00': '1028',
      '7.25': '1029',
      '7.50': '1030',
      '7.75': '1031',
      '8.00': '1032',
      '8.25': '1033',
      '8.50': '1034',
      '8.75': '1035',
      '9.00': '1036',
      '9.25': '1037',
      '9.50': '1038',
      '9.75': '1039',
      '-0.25': '1501',
      '-0.50': '1502',
      '-0.75': '1503',
      '-1.00': '1504',
      '-1.25': '1505',
      '-1.50': '1506',
      '-1.75': '1507',
      '-2.00': '1508',
      '-2.25': '1509',
      '-2.50': '1510',
      '-2.75': '1511',
      '-3.00': '1512',
      '-3.25': '1513',
      '-3.50': '1514',
      '-3.75': '1515',
      '-4.00': '1516',
      '-4.25': '1517',
      '-4.50': '1518',
      '-4.75': '1519',
      '-5.00': '1520',
      '-5.25': '1521',
      '-5.50': '1522',
      '-5.75': '1523',
      '-6.00': '1524',
      '-6.25': '1525',
      '-6.50': '1526',
      '-6.75': '1527',
      '-7.00': '1528',
      '-7.25': '1529',
      '-7.50': '1530',
      '-7.75': '1531',
      '-8.00': '1532',
      '-8.25': '1533',
      '-8.50': '1534',
      '-8.75': '1535',
      '-9.00': '1536',
      '-9.25': '1537',
      '-9.50': '1538',
      '-9.75': '1539',
    },
    ou: {
      '0.25': '2001',
      '0.50': '2002',
      '0.75': '2003',
      '1.00': '2004',
      '1.25': '2005',
      '1.50': '2006',
      '1.75': '2007',
      '2.00': '2008',
      '2.25': '2009',
      '2.50': '2010',
      '2.75': '2011',
      '3.00': '2012',
      '3.25': '2013',
      '3.50': '2014',
      '3.75': '2015',
      '4.00': '2016',
      '4.25': '2017',
      '4.50': '2018',
      '4.75': '2019',
      '5.00': '2020',
      '5.25': '2021',
      '5.50': '2022',
      '5.75': '2023',
      '6.00': '2024',
      '6.25': '2025',
      '6.50': '2026',
      '6.75': '2027',
      '7.00': '2028',
      '7.25': '2029',
      '7.50': '2030',
      '7.75': '2031',
      '8.00': '2032',
      '8.25': '2033',
      '8.50': '2034',
      '8.75': '2035',
      '9.00': '2036',
      '9.25': '2037',
      '9.50': '2038',
      '9.75': '2039',
      '10.00': '2040',
      '10.25': '2041',
      '10.50': '2042',
      '10.75': '2043',
      '11.00': '2044',
      '11.25': '2045',
      '11.50': '2046',
      '11.75': '2047',
      '12.00': '2048',
      '12.25': '2049',
      '12.50': '2050',
      '12.75': '2051',
      '13.00': '2052',
      '13.25': '2053',
      '13.50': '2054',
      '13.75': '2055',
      '14.00': '2056',
      '14.25': '2057',
      '14.50': '2058',
      '14.75': '2059',
      '15.00': '2060',
      '15.25': '2061',
      '15.50': '2062',
      '15.75': '2063',
      '16.00': '2064',
      '16.25': '2065',
      '16.50': '2066',
      '16.75': '2067',
      '17.00': '2068',
      '17.25': '2069',
      '17.50': '2070',
      '17.75': '2071',
      '18.00': '2072',
      '18.25': '2073',
      '18.50': '2074',
      '18.75': '2075',
      '19.00': '2076',
      '19.25': '2077',
      '19.50': '2078',
      '19.75': '2079',
      '20.00': '2080',
      '20.25': '2081',
      '20.50': '2082',
      '20.75': '2083',
      '21.00': '2084',
      '21.25': '2085',
      '21.50': '2086',
      '21.75': '2087',
      '22.00': '2088',
      '22.25': '2089',
      '22.50': '2090',
      '22.75': '2091',
      '23.00': '2092',
      '23.25': '2093',
      '23.50': '2094',
      '23.75': '2095',
      '24.00': '2096',
      '24.25': '2097',
      '24.50': '2098',
      '24.75': '2099',
      '25.00': '2100',
      '25.25': '2101',
      '25.50': '2102',
      '25.75': '2103',
      '26.00': '2104',
      '26.25': '2105',
      '26.50': '2106',
      '26.75': '2107',
      '27.00': '2108',
      '27.25': '2109',
      '27.50': '2110',
      '27.75': '2111',
      '28.00': '2112',
      '28.25': '2113',
      '28.50': '2114',
      '28.75': '2115',
      '29.00': '2116',
      '29.25': '2117',
      '29.50': '2118',
      '29.75': '2119',
      '30.00': '2120',
      '30.25': '2121',
      '30.50': '2122',
      '30.75': '2123',
      '31.00': '2124',
      '31.25': '2125',
      '31.50': '2126',
      '31.75': '2127',
      '32.00': '2128',
      '32.25': '2129',
      '32.50': '2130',
      '32.75': '2131',
      '33.00': '2132',
      '33.25': '2133',
      '33.50': '2134',
      '33.75': '2135',
      '34.00': '2136',
    } };
  }
  setConfig(config) {
    this.config = config;
    return true;
  }
  init(){
    return true;
  }

  addLeagueUpdateCallback(callback) {
    this.leagueUpdateCallbacks.push(callback);
  }
  addLeagueGroupUpdateCallback(callback) {
    this.leagueGroupUpdateCallbacks.push(callback);
  }
  addEventUpdateCallback(callback) {
    this.eventUpdateCallbacks.push(callback);
  }
  addEventGroupUpdateCallback(callback) {
    this.eventGroupUpdateCallbacks.push(callback);
  }
  addGameUpdateCallback(callback) {
    this.gameUpdateCallbacks.push(callback);
  }
  addOddsUpdateCallback(callback) {
    this.oddsUpdateCallbacks.push(callback);
  }
  /*
  proceedCallbacks = (value, callbacks = []) => {
    if (callbacks.length > 0) {
      Promise.map(callbacks, (callback) => {
        return new Promise((resolve, reject) => {
          var returnValue = callback(value)
          if (typeof returnValue !== 'undefined' && returnValue !== null) {
            returnValue ? resolve(returnValue) : reject(returnValue)
          } else {
            resolve(true)
          }
        })
      }, {concurrency: 1})
    } else {
      console.log('nothing in callbacks')
    }
  }
  */
  // setObjects insert works, update not working
  setObjects(objType, inputObjArr) {
    // console.log('->setObjects');
    const objArr = (!_.isArray(inputObjArr) ? [inputObjArr] : inputObjArr);
    const dbChain2 = this.redis.pipeline();
    _.each(objArr, (inputObj) => {
      dbChain2.hgetall(`obj:${inputObj.id}`);
    });
    return dbChain2.exec().then((DBTmpResult) => {
      let DBResult = {};
      _.each(DBTmpResult, (tmpObj) => {
        if (!_.isNull(tmpObj) && !_.isUndefined(tmpObj) && !_.isEmpty(tmpObj[1])) {
          DBResult[`obj:${tmpObj[1].id}`] = tmpObj[1];
        }
      });
      // console.log(_.keys(result));
      const now = Date.now();
      const dbChain = this.redis.pipeline();
      // const dbChain = this.redis;
      let isDiff = 0;
      let isDuplicate = 0;
      _.each(objArr, (inputObj) => {
        const objToWrite = _.omit(inputObj, ['rawJson', 'searchId', 'lastUpdate']);
        const objToCompare = {};
        _.each(_.keys(objToWrite), (key) => {
          objToCompare[key] = String(inputObj[key]);
        });
        const objKey = `obj:${inputObj.id}`;
        // console.log(_.keys(DBResult));
        if ((!_.has(DBResult, objKey)) || (!_.isEqual(DBResult[objKey], objToCompare))) {
          objToWrite.lastUpdate = now;
          isDiff += 1;
          dbChain.hmset(objKey, objToWrite);
          if (_.has(inputObj, 'searchId')) {
            dbChain.set(`obj:${inputObj.searchId}`, objToWrite.id);
          }
          dbChain.zadd('objset', now, inputObj.id);
          dbChain.publish(`objUpdate_${objType}`, `set ${inputObj.id}`);
        } else {
          isDuplicate += 1;
        }
      });
      console.log('setObjects #:%d, %d', isDiff, isDuplicate);
      return dbChain.exec();
      // return Promise.resolve();
    });
  }
  clearObjects(objType) {
    const keys = this.redis.keys(`obj:${objType}`);
    // let valueArr = [];
    const dbChain = this.redis.pipline();
    _.each(keys, (key) => {
      dbChain.del(key).publish(`objUpdate_${objType}`, `del ${key}`);
    });
    return dbChain.exec();
  }
  // --------------------------------
  setEventGroup(leagueGroupId, name, eventObj) {
    var eventGroupObj = {
      leagueGroupId: leagueGroupId,
      name: name,
      events: eventObj
    }
    return this.setObjects(this.eventGroupCollection, [eventGroupObj], this.eventGroupUpdateCallbacks, true);
  }

  clearEventGroup () {
    return this.clearObjects(this.eventGroupCollection, this.eventGroupUpdateCallbacks, true);
  }

  setLeagueGroup (name, leagues) {
    var leagueGroupObj = {
      name: name,
      leagues: leagues
    }
    return this.setObjects(this.leagueGroupCollection, [leagueGroupObj], this.leagueGroupUpdateCallbacks, true);
  }

  clearLeagueGroup () {
    return this.clearObjects(this.leagueGroupCollection, this.leagueGroupUpdateCallbacks, true);
  }

  flushTeam() {
    return this.setObjects(this.teamCollection, this.teamBuff, this.teamUpdateCallbacks, false)
      .then(() => {
        this.teamBuff = [];
        return Promise.resolve(true);
      })
  }

  delaySetTeam(providerCode, teamCode, teamName) {
    this.teamBuff.push({
      id: `t#p:${providerCode}#t:${teamCode}`,
      providerCode: String(providerCode),
      teamCode: String(teamCode),
      teamName: String(teamName),
    });
  }

  setTeam(provideCode, teamCode, teamName) {
    this.delaySetTeam(provideCode, teamCode, teamName);
  }

  delaySetLeague(providerCode, leagueCode, leagueName) {
    this.leagueBuff.push({
      id: `l#p:${providerCode}#l:${querystring.escape(leagueCode)}`,
      providerCode: String(providerCode),
      leagueCode: String(leagueCode),
      leagueName: String(leagueName),
    });
    return Promise.resolve(true);
  }

  flushLeague() {
    return this.setObjects(this.leagueCollection,
      this.leagueBuff, this.leagueUpdateCallbacks, false).then(() => {
      this.leagueBuff = [];
      return Promise.resolve(true);
    });
  }

  setLeague(providerCode, leagueCode, leagueName) {
    return this.delaySetLeague(providerCode, leagueCode, leagueName)
      .then(this.flushLeague())
      .then(Promise.resolve(true));
  }

  flushEvent() {
    return this.setObjects(this.eventCollection, this.eventBuff,
      this.eventUpdateCallbacks, false).then(() => {
      this.eventBuff = [];
      return Promise.resolve(true);
    });
  }

  delaySetEvent(providerCode, leagueCode, eventCode, homeTeamCode, awayTeamCode, eventStatus, rawJson) {
    this.eventBuff.push({
      id: `e#p:${providerCode}#l:${querystring.escape(leagueCode)}#e:${querystring.escape(eventCode)}`,
      searchId: `eid#p:${providerCode}#e:${eventCode}`,
      providerCode: String(providerCode),
      leagueCode: String(leagueCode),
      eventCode: String(eventCode),
      homeTeamCode: String(homeTeamCode),
      awayTeamCode: String(awayTeamCode),
      eventStatus: String(eventStatus),
      rawJson: rawJson
    })
    return Promise.resolve(true);
  }
  setEvent(providerCode, leagueCode, eventCode, homeTeam, awayTeam, eventStatus, rawJson) {
    return this.delaySetEvent(providerCode, leagueCode, eventCode, homeTeam, awayTeam, eventStatus, rawJson)
      .then(this.flushEvent())
      .then(Promise.resolve(true));
  }

  async getEventByEventId (providerCode, eventId) {
    const key = await this.redis.get(`eid#p:${providerCode}#e:${querystring.escape(eventId)}`);
    const returnValue = await this.redis.hmget(key);
    return returnValue;
  }
  // TODO: think about the parameters again

  flushGame() {
    return this.setObjects(this.gameCollection, this.gameBuff, this.gameUpdateCallbacks, false)
      .then(() => {
        this.gameBuff = [];
        return Promise.resolve(true);
      });
  }
  delaySetGame(providerCode, leagueCode, eventCode, gameCode, gameTypeStr, rawJson) {
    this.gameBuff.push({
      id: `g#p:${providerCode}#l:${querystring.escape(leagueCode)}#e:${querystring.escape(eventCode)}#gt:${gameTypeStr}`,
      providerCode: String(providerCode),
      leagueCode: String(leagueCode),
      eventCode: String(eventCode),
      gameCode: String(gameCode),
      gameTypeStr: String(gameTypeStr),
      rawJson: rawJson
    })
    return Promise.resolve(true);
  }
  setGame(providerCode, leagueCode, eventCode, gameCode, gameTypeStr, rawJson) {
    return this.delaySetGame(providerCode, leagueCode, eventCode, gameCode, gameTypeStr, rawJson)
      .then(this.flushGame())
      .then(Promise.resolve(true));
  }

  setOdds(providerCode, leagueCode, eventCode, gameCode, gameTypeStr, oddCode, homeOrAway, odds, cutOffTimestamp, rawJson) {
    // console.log('setOdd - providerCode:%s, eventId:%s, gameTypeStr:%s, oddCode:%s, optionNum:%s, odds:%s, cutOffTimestamp:%s', providerCode, eventId, gameTypeStr, oddCode, optionNum, odds, cutOffTimestamp )
    return this.delaySetOdds(providerCode, leagueCode, eventCode, gameCode, gameTypeStr, oddCode, homeOrAway, odds, cutOffTimestamp, rawJson)
      .then(this.flushOdds())
      .then(Promise.resolve(true));
  }

  flushOdds() {
    return this.setObjects(this.oddsCollection, this.oddsBuff, this.oddsUpdateCallbacks, false)
      .then(() => {
        this.oddsBuff = [];
        return Promise.resolve(true);
      })
  }

  delaySetOdds(providerCode, leagueCode, eventCode, gameCode, gameTypeStr, oddCode, homeOrAway, odds, cutOffTimestamp, rawJson) {
    this.oddsBuff.push({
      id: `o#p:${providerCode}#l:${querystring.escape(leagueCode)}#e:${querystring.escape(eventCode)}#gt:${gameTypeStr}#o:${oddCode}`,
      providerCode: String(providerCode),
      leagueCode: String(leagueCode),
      eventCode: String(eventCode),
      gameCode: String(gameCode),
      gameTypeStr: String(gameTypeStr),
      oddCode: String(oddCode),
      homeOrAway: String(homeOrAway),
      odds: Number(odds),
      cutOffTimestamp: cutOffTimestamp,
      rawJson: rawJson
    });
    return Promise.resolve(true);
  }

  encodeGameType(period, team, gameType, gameTypeDetail) {
    var gameTypeStr = '';
    gameTypeStr += this.gamePeriodMap[period] + this.gameTeamMap[team] + this.gameTypeMap[gameType][gameTypeDetail];
    if (gameTypeStr.length !== 6) {
      console.error('something wrong. gameTypeStr:%s period:%s team:%s gameType:%s gameTypeDetail:%s', gameTypeStr, period, team, gameType, gameTypeDetail);
    }
    return gameTypeStr;
  }
}


module.exports = InfoHandler
