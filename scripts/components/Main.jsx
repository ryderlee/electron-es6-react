/**
 * In this file, we create a React component
 * which incorporates components providedby material-ui.
 */

import React from 'react';
import {deepOrange500} from 'material-ui/styles/colors';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import { Container, Row, Col, Visible, Hidden } from 'react-grid-system';


import { Tabs, Tab } from 'material-ui/Tabs';

import MatchingLeague from './MatchingLeague'
import MatchingEventListing from './MatchingEventListing'
import DevDashboard from './DevDashboard'

const styles = {
  headline: {
    fontSize: 24,
    paddingTop: 16,
    marginBottom: 12,
    fontWeight: 400,
  },
  chip: {
    margin: 4,
  },
  wrapper: {
    display: 'flex',
    flexWrap: 'wrap',
  },
};

function handleActive(tab) {
  alert(`A tab with this route property ${tab.props['data-route']} was activated.`);
}

const muiTheme = getMuiTheme({
  palette: {
    accent1Color: deepOrange500,
  },
});
class Main extends React.Component {
  constructor(props, context) {
    super(props, context)

    this.state = {
      open: false,
    }
  }

  render() {
    return (
      <MuiThemeProvider muiTheme={muiTheme}>
        <Tabs>
          <Tab label="Setup">
            <MatchingLeague unmatchLeagues={this.props.unmatchLeagues} leagueGroups={this.props.leagueGroups} viewHandler={this.props.viewHandler} config={this.props.config} />
            <MatchingEventListing leagueGroups={this.props.leagueGroups} config={this.props.config} unmatchEvents={this.props.unmatchEvents} eventGroups={this.props.eventGroups} viewHandler={this.props.viewHandler} />
          </Tab>
          <Tab label="Item Two" >
            <div>
              <h2 style={styles.headline}>Tab Two</h2>
              <p>

              </p>
            </div>
          </Tab>
          <Tab label="Development" >
            <div>
              <h2 style={styles.headline}>Tab Three</h2>
              <p>
                <DevDashboard infoHandler={this.props.infoHandler} viewHandler={this.props.viewHandler} />
              </p>
            </div>
          </Tab>
        </Tabs>
      </MuiThemeProvider>
    )
  }
}
export default Main;
