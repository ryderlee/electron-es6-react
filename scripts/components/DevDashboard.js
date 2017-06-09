/**
 * In this file, we create a React component
 * which incorporates components providedby material-ui.
 */

const _ = require('lodash')

import React from 'react'
import {FlatButton, RaisedButton} from 'material-ui'
import { Container, Row, Col, Visible, Hidden } from 'react-grid-system'
import SelectField from 'material-ui/SelectField'
import MenuItem from 'material-ui/MenuItem'


//import {blue300, blue100, red300, red100} from 'material-ui/styles/colors';


class DevDashboard extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.styles = {
      chip: {
        margin: 4
      },
      wrapper: {
        display: 'flex',
        flexWrap: 'wrap'
      }
    }
    this.state = this.getDefaultState()
  }

  getDefaultState () {
    return {
      selectedEventGroup: null
    }
  }
  handleDeleteEventGroup (e) {
    this.props.viewHandler.handleClearEventGroup()
  }
  handleDeleteLeagueGroup (e) {
    this.props.viewHandler.handleClearLeagueGroup()
  }
  handleSelectedEventGroupChange (event, idx, value) {
    var eventGroup = this.props.infoHandler.eventGroupCollection.findById(value)
    this.setState({selectedEventGroup: eventGroup})
    _.each(eventGroup.events, (event) => {
      console.debug('find by %s : eventCode : %s', event.providerCode, event.eventCode )
      var games = this.props.infoHandler.gameCollection.find({
        providerCode: {
          $eq: event.providerCode
        },
        eventCode: {
          $eq: event.eventCode
        }
      })
      console.log(_.groupBy(games, 'gameTypeStr'))
    })
  }
  render () {
    return (
      <Container>
        <Row>
          <Col sm={3}>
            <RaisedButton label="Delete LeagueGroup records" onTouchTap={(event) => this.handleDeleteLeagueGroup(event)} />
          </Col>
          <Col sm={3}>
            <RaisedButton label="Prompt LeagueGroup records" onTouchTap={(event) => { console.log(this.props.infoHandler.leagueGroupObjArr) }} />
          </Col>
          <Col sm={3}>
            <RaisedButton label="Delete EventGroup records" onTouchTap={(event) => this.handleDeleteEventGroup(event)} />
          </Col>
          <Col sm={3}>
            <RaisedButton label="Prompt EventGroup records" onTouchTap={(event) => { console.log(this.props.infoHandler.eventGroupObjArr) }} />
          </Col>
        </Row>
        <Row>
          <Col sm={3}>
            <SelectField value={this.state.selectedEventGroup} onChange={(event, idx, value) => this.handleSelectedEventGroupChange(event, idx, value)} autoWidth={true}>
              {_.map(this.props.infoHandler.eventGroupObjArr, (eventGroup) => {
                return (
                  <MenuItem value={eventGroup._id} primaryText={eventGroup.events[0].homeTeamCode + '/' + eventGroup.events[0].awayTeamCode} />
                )
              })}
            </SelectField>
          </Col>
          <Col sm={3}>
            <RaisedButton label="Prompt Odds" onTouchTap={(event) => { console.log(this.props.infoHandler.oddsObjArr) }} />
          </Col>
          <Col sm={3}>
            <RaisedButton label="Prompt EventCache" onTouchTap={(event) => { console.log(this.props.infoHandler.strategyHandler) }} />
          </Col>
        </Row>
      </Container>
    )
  }
}

export default DevDashboard
