/**
 * In this file, we create a React component
 * which incorporates components providedby material-ui.
 */

const _ = require('lodash')

import React from 'react'
import MatchingEvent from './MatchingEvent'
import { Container, Row, Col, Visible, Hidden } from 'react-grid-system'

import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card'

class MatchingEventListing extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.styles = {
      chip: {
        margin: 4
      },
      wrapper: {
        display: 'flex',
        flexWrap: 'wrap'
      },
    }
    this.state = {
    }
  }

  render () {
    var unmatchEventsByLeagueCode = _.groupBy(this.props.unmatchEvents, 'leagueCode')

    return (
      <Card>
      <CardHeader title="Event to be Match" actAsExpander={true} showExpandableButton={true} />
      <CardText expandable={true}>
        <Container>
          {_.map(this.props.leagueGroups, (leagueGroup) => {
            // console.log('leagueGroup.name')
            // console.log(leagueGroup.name)
            var eventGroups = _.filter(this.props.eventGroups, ['leagueGroupId', leagueGroup._id])
            var unmatchEventsUnderLeague = []
            _.each(leagueGroup.leagues, (league) => {
              if (league.leagueCode in unmatchEventsByLeagueCode) {
                unmatchEventsUnderLeague = _.concat(unmatchEventsUnderLeague, (unmatchEventsByLeagueCode[league.leagueCode]))
              }
            })
            // console.log('unmatchEventsUnderLeague')
            // console.log(unmatchEventsUnderLeague)
            // console.log('eventGroups')
            // console.log(eventGroups)
            return (
              <Row><Col sm={12}>
                <MatchingEvent key={'leagueGroup' + leagueGroup.name} unmatchEvents={unmatchEventsUnderLeague} eventGroups={eventGroups} leagueGroup={leagueGroup} config={this.props.config} viewHandler={this.props.viewHandler} />
              </Col></Row>
            )
          })}
        </Container>
      </CardText>
      </Card>
    )
  }
}

export default MatchingEventListing
