const config = {};

config.controller = {
  connections: [
    {
      // 0
      connectionID: 'isn',
      enabled: true,
      connectionKey: 'isn1',
      forBetting: false,
      config: {
        username: 'c00001',
        password: '1234aaaa',
        sportId: 1,
        momentFormatStr: 'LTS',
        errorReconnectDuration: 5000,
        eventUpdateDuration: 10000,
        liveEventUpdateDuration: 2000,
        apiKeyDuration: 12000,
        proxy: {
          enableProxy: false,
          proxySetting: {
            host: '139.59.3.255',
            port: 7777,
            auth: {
              username: 'mikeymike',
              password: 'rapunz3l',
            },
          },
        },
        market: {
          live: true,
          today: true,
          early: true,
        },
      },
    },
    {
      connectionID: 'pinbet',
      enabled: false,
      connectionKey: 'pinbet1',
      forBetting: false,
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
        eventPriceUpdateRetryDuration : 5000,
        proxy: {
          enableProxy: false,
          proxySetting: {
            host: '127.0.0.1',
            port: 9000,
            auth: {
              username: 'mikeymike',
              password: 'rapunz3l',
            },
          },
        },
        market: {
          live: true,
          today: true,
          early: true,
        },
      },
    },
    {
      connectionID: 'sbo',
      enabled: true,
      connectionKey: 'sbo1',
      forBetting: false,
      config: {
        username: 'Vdfb021',
        password: 'aaaa1234',
        momentFormatStr: 'LTS',
        errorReconnectDuration: 5000,
        updateDuration: 5000,
        proxy: {
          enableProxy: false,
          proxySetting: {
            host: '139.59.3.255',
            port: 7777,
            auth: {
              username: 'mikeymike',
              password: 'rapunz3l',
            },
          },
        },
        market: {
          live: false,
          today: false,
          early: true,
        },
      },
    },
    {
      connectionID: 'sbo',
      enabled: true, 
      connectionKey: 'sbo3',
      forBetting: false,
      config: {
        username: 'Vdfb023',
        password: 'aaaa1234',
        momentFormatStr: 'LTS',
        errorReconnectDuration: 5000,
        updateDuration: 5000,
        proxy: {
          enableProxy: false,
          proxySetting: {
            host: '139.59.3.255',
            port: 7777,
            auth: {
              username: 'mikeymike',
              password: 'rapunz3l',
            },
          },
        },
        market: {
          live: false,
          today: true,
          early: false,
        },
      },
    },
    {
      connectionID: 'sbo',
      enabled: true,
      connectionKey: 'sbo2',
      forBetting: false,
      config: {
        username: 'Vdfb022',
        password: 'aaaa1234',
        momentFormatStr: 'LTS',
        errorReconnectDuration: 5000,
        updateDuration: 1000,
        proxy: {
          enableProxy: false,
          proxySetting: {
            host: '139.59.3.255',
            port: 7777,
            auth: {
              username: 'mikeymike',
              password: 'rapunz3l',
            },
          },
        },
        market: {
          live: true,
          today: false,
          early: false,
        },
      },
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
    }
  ],
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
