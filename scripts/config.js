
var config = {}

config.controller = {
  connections: [{
    // 0
    connectionID: 'isn',
    enabled: true,
    connectionKey: 'isn1',
    config: {
      username: 'c00001',
      password: '1234aaaa',
      eventScheduleId: 1,
      sportId: 1,
      momentFormatStr: 'LTS',
      errorReconnectDuration: 5000,
      eventUpdateDuration: 20000,
      eventPriceUpdateDuration: 10000,
      apiKeyDuration: 12000,
    },
  },
  {
    connectionID: 'pinbet',
    enabled: false,
    connectionKey: 'pinbet1',
    config: {
      username: 'Ch8ccctest',
      password: '1234aaaa',
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
    enabled: true,
    connectionKey: 'sbo1',
    config: {
      username: 'Vdfb330',
      password: '1234aaaa',
      momentFormatStr: 'LTS',
      errorReconnectDuration: 5000,
      updateDuration: 10000
    }
  },
  {
    connectionID: 'maxbet',
    enabled: false,
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
  },
  sourceOfTruthConnections: {
      enabled: false,
      connectionID: 'bettingOddsAPI',
      connectionKey: 'bettingOddsAPI1',
      config: {
        x_mashape_key: 'jFt7WCmZsUmshwncMfEHszWrETUfp1YZ0f3jsnRxFjel443iLX',
        x_mashape_host: 'bettingodds-bettingoddsapi-v1.p.mashape.com',
        dateToGet: 4,
        url: {
          getLeagues: 'https://bettingodds-bettingoddsapi-v1.p.mashape.com/leagues',
          getEventsByDate: 'https://bettingodds-bettingoddsapi-v1.p.mashape.com/events/',
        },
      },
    }
}

module.exports = config
