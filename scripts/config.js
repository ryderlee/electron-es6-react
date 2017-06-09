
var config = {}

config.controller = {
  connections: [{
    // 0
    connectionID: 'isn',
    enabled: false,
    connectionKey: 'isn1',
    config: {
      username: 'c00001',
      password: '1234aaaa',
      eventScheduleId: 2,
      sportId: 1,
      momentFormatStr: 'LTS',
      errorReconnectDuration: 5000,
      eventUpdateDuration: 20000,
      eventPriceUpdateDuration: 10000,
      apiKeyDuration: 12000
    }
  },
  {
    connectionID: 'pinbet',
    enabled: false,
    connectionKey: 'pinbet1',
    config: {
      username: 'hc202fc111',
      password: '1234QQqq',
      momentFormatStr: 'LTS',
      errorReconnectDuration: 5000,
      leagueUpdateDuration: 30000,
      eventUpdateDuration: 10000,
      eventPriceUpdateDuration: 10000,
      eventUpdateRetryDuration : 5000,
      leagueUpdateRetryDuration : 5000,
      eventPriceUpdateRetryDuration : 5000
    }
  },
  {
    connectionID: 'sbo',
    enabled: false,
    connectionKey: 'sbo1',
    config: {
      username: 'vdfb660',
      password: '1234aaaa',
      momentFormatStr: 'LTS',
      errorReconnectDuration: 5000,
      updateDuration: 10000
    }
  },
  {
    connectionID: 'maxbet',
    enabled: true,
    connectionKey: 'maxbet1',
    config: {
      username: 'sfbopfb660',
      password: 'AAaa1234',
      momentFormatStr: 'LTS',
      errorReconnectDuration: 5000,
      updateDuration: 10000
    }
  }],
  view: {
    connections: {
      sbo:
        {connectionName: 'SBO',
          chipShortForm: 'SBO',
          chipColor: 'green'},
      pinbet:
        {connectionName: 'Pinacle',
          chipShortForm: 'PIN',
          chipColor: 'red'},
      isn:
        {connectionName: 'ISN',
        chipShortForm: 'ISN',
        chipColor: 'blue'}
    }
  },
  strategy: {
  }
}

module.exports = config
