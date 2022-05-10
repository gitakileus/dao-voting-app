import React, { useEffect, useState } from 'react';
import { styled } from '@linaria/react';
import { css } from '@linaria/core';

import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Window, Button, VotingBar, ChangeDecisionPopup } from '@app/shared/components';
import { VoteProposal } from '@core/api';
import { EpochStatsSection, ProposalsList } from '@app/containers/Main/components';
import { selectRate, selectProposal, selectUserView,
  selectCurrentProposals, selectFutureProposals,
  selectAppParams, selectTotalsView } from '../../store/selectors';
import { loadRate } from '@app/containers/Main/store/actions';
import {
  IconVoteButtonNo,
  IconVoteButtonYes,
  IconVotedYes,
  IconVotedNo,
  IconChangeDecision,
  IconExternalLink,
  IconQuorumAlert,
  IconQuorumApprove
} from '@app/shared/icons';
import { useParams } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { PROPOSALS, ROUTES } from '@app/shared/constants';
import { fromGroths, getProposalId, toGroths, numFormatter, calcVotingPower } from '@core/appUtils';
import { ProcessedProposal } from '@app/core/types';
import { openInNewTab } from '@core/appUtils'; 
import { selectTransactions } from '@app/shared/store/selectors';

interface locationProps { 
  id: number,
  type: string,
  index: number
}

interface ProposalContentProps {
  proposal: ProcessedProposal,
  state: locationProps,
  callback?: any,
  isChangeProcessActive?: boolean,
  onDisableChangeProcessState?: ()=>void
}

const StatsSectionClass = css`
  margin-bottom: 40px;
`;

const Proposal = styled.div`
  border-radius: 10px;
  width: 100%;
  background-color: rgba(255, 255, 255, .05);
`;

const HeaderStyled = styled.div`
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  padding: 20px;
  background-color: rgba(255, 255, 255, .05);
  display: flex;
  flex-direction: row;
  width: 100%;

  > .id-section {
    font-weight: 400;
    color: rgba(255, 255, 255, .5);
  }

  > .middle-section {
    margin-left: 20px;
    line-height: 18px;
    max-width: 85%;
    word-wrap: break-word;

    > .title {
      font-weight: 700;
      font-size: 18px;
    }

    > .forum-link {
      font-weight: 400;
      font-size: 16px;
      color: #00F6D2;
      margin-top: 10px;
      display: flex;
      cursor: pointer;
      align-items: center;

      > .icon-link {
        margin-left: 5px;
        margin-bottom: 2px;
      }
    }
  }

  > .date-section {
    margin-top: 2px;
    margin-left: auto;
    font-size: 12px;
    opacity: .5;
  }
`;

const ContentStyled = styled.div`
  padding: 20px;

  > .controls {
    display: flex;
    margin-bottom: 5px;

    > .button {
      max-width: none
    }

    > .button.no {
      margin-left: 20px;
      color: var(--color-white);
    }
  }

  > .voted-finished {
    font-style: italic;
    font-size: 14px;
    opacity: 0.5;
    margin-bottom: 25px;
  }

  > .voted-controls {
    width: 100%;
    display: flex;
    margin-bottom: 25px;

    > .change-button {
      margin: 0 0 0 auto;
    }

    > .voted-cant {
      font-style: italic;
      opacity: 0.5;
      margin-left: auto;
    }

    > span {
      display: flex;
      align-items: start;
    }

    > span .voted-yes {
      margin-left: 10px;
      color: #00F6D2;
    }

    > span .voted-no {
      margin-left: 10px;
      color: #DE3155;
    }
  }

  > .content {
    display: flex;
    flex-direction: column;

    > .epoch-comes {
      font-weight: 400;
      font-size: 14px;
      font-style: italic;
      opacity: .5;
    }

    > .separator {
      height: 1px;
      width: 100%;
      background-color: rgba(255, 255, 255, 0.1);
      margin: 20px 0;
    }

    > .description {
      font-size: 14px;
      word-wrap: break-word;
    }

    > .stake-info {
      display: flex;
      flex-direction: row;
      margin-top: 20px;

      > .total {
        > .value {
          margin-top: 5px;
          font-weight: 700;
        }
      }

      > .other {
        margin-left: 50px;

        > .value {
          margin-top: 5px;
        }
      }
    }

    > .ref-title {
      margin-top: 20px;
      font-size: 12px;
      opacity: .5;
    }

    > .ref-link {
      font-weight: 700;
      font-size: 14px;
      color: #00F6D2;
      margin-top: 5px;
      display: flex;
      cursor: pointer;
      align-items: center;

    > .icon-link {
      margin-left: 5px;
      margin-bottom: 2px;
    }
  }
`;

const StyledStats = styled.div`
  display: flex;
  flex-direction: row;
  margin-top: 20px;
  align-items: start;

  > .voted,
  > .staked,
  > .quorum {
    margin-left: 60px;
  }

`;

const StyledStakeTitle = styled.div`
  font-size: 12px;
  opacity: .5;
`;

const StyledHorSeparator = styled.div`
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 20px 0 15px 0;
`;

const StyledStatsValue = styled.div`
  margin-top: 6px;
  font-size: 14px;

  > .yes {
    font-weight: 700;
  }

  > .no {
    margin-left: 20px;
    font-weight: 700;
  }
`;

const VerticalSeparator = styled.div`
  height: 37px;
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 10px 0 35px;
`;

const QuorumIconClass = css`
  margin-left: 5px;
`;

const CurrentProposalContent: React.FC<ProposalContentProps> = (
  {proposal, state, callback, isChangeProcessActive, onDisableChangeProcessState}
) => {
  const userViewData = useSelector(selectUserView());
  const currentProposals = useSelector(selectCurrentProposals());
  const totalsView = useSelector(selectTotalsView());
  const [isVoted, setIsVoted] = useState(false);
  const [isQuorumPassed, setQuorumPassed] = useState(false);
  const transactions = useSelector(selectTransactions());
  const [isVoteInProgress, setVoteInProgress] = useState(false);

  useEffect(() => {
    if (proposal.voted !== undefined && proposal.voted < 255) {
      setIsVoted(true);
    }

    if (proposal.data.quorum !== undefined && 
      (proposal.data.quorum.type === 'beamx' ? proposal.stats.variants[1] >= toGroths(proposal.data.quorum.value) : 
      ((proposal.stats.variants[1] / totalsView.stake_active) * 100 >= proposal.data.quorum.value))) {
        setQuorumPassed(true);
    }

    const activeVotes = localStorage.getItem('votes');
    
    if (activeVotes) {
      const votes = [...(JSON.parse(activeVotes).votes)];

      const currentProposal = votes.find((item) => {
        return item.id === proposal.id;
      });

      if (currentProposal) {
        const isInProgress = transactions.find((tx) => {
          return tx.txId === currentProposal.txid && tx.status === 5;
        });

        setVoteInProgress(!!isInProgress);
        
        if (!isInProgress) {
          const updatedVotes = votes.filter(function(item){ 
            return item.id !== proposal.id;
          });

          localStorage.setItem('votes', JSON.stringify({votes: updatedVotes}));
        }
      }
    }
  }, [proposal]);
  
  const handleVoteClick = (vote: number) => {
    let votes = [];

    if (userViewData.current_votes !== undefined) {
      votes = [...userViewData.current_votes];
    } else {
      votes = new Array(currentProposals.items.length).fill(255);
    }

    votes[state.index] = vote;
    VoteProposal(votes, proposal.id);
    onDisableChangeProcessState();
  };

  const handleChange = () => {
    callback();
  };

  return (
    <ContentStyled>
      { isChangeProcessActive || (proposal.voted === undefined || proposal.voted === 255) ?
        (<div className='controls'>
          <Button variant='regular' pallete='green' onClick={()=>handleVoteClick(1)} disabled={isVoteInProgress}
            className='button yes' icon={IconVoteButtonYes} >YES</Button>
          <Button variant='regular' pallete='vote-red' onClick={()=>handleVoteClick(0)} disabled={isVoteInProgress}
            className='button no' icon={IconVoteButtonNo} >NO</Button>
        </div>) :
        (<div className='voted-controls'>
          { proposal.voted === 1 ? 
            (<span>
              <IconVotedYes/>
              <span className='voted-yes'>You voted YES</span>
            </span>) : 
            (<span>
              <IconVotedNo/>
              <span className='voted-no'>You voted NO</span>
            </span>)
          }
          <Button pallete='white'
            className='change-button'
            onClick={handleChange}
            variant='link'
            icon={IconChangeDecision}>
                change decision
          </Button>
        </div>)
      }
      <VotingBar active={proposal.voted !== undefined && proposal.voted < 255}
        value={proposal.stats.variants[1]}
        percent={proposal.stats.variants[1] / proposal.stats.total * 100}
        voteType='yes'/>
      <VotingBar active={proposal.voted !== undefined && proposal.voted < 255}
        value={proposal.stats.variants[0]}
        percent={proposal.stats.variants[0] / proposal.stats.total * 100}
        voteType='no'/>
      <StyledStats>
        <span className='total'>
          <StyledStakeTitle>Total staked</StyledStakeTitle>
          <StyledStatsValue>{numFormatter(fromGroths(totalsView.stake_active))} BEAMX</StyledStatsValue>
        </span>
       <span className='voted'>
            <StyledStakeTitle>Voted</StyledStakeTitle>
            <StyledStatsValue>{numFormatter(fromGroths(proposal.stats.total))} BEAMX</StyledStatsValue>
        </span>
        <span className='staked'>
          <StyledStakeTitle>Your staked</StyledStakeTitle>
          <StyledStatsValue>{numFormatter(fromGroths(userViewData.stake_active))} BEAMX</StyledStatsValue>
        </span>
        {
          proposal.data.quorum !== undefined && 
          <span className='quorum'>
            <StyledStakeTitle>Quorum</StyledStakeTitle>
            <StyledStatsValue>
              { proposal.data.quorum.type === 'beamx' ? 
                (numFormatter(proposal.data.quorum.value) + ' BEAMX') :
                (proposal.data.quorum.value + '%') }
              { isQuorumPassed ? <IconQuorumApprove className={QuorumIconClass}/> : <IconQuorumAlert className={QuorumIconClass}/>}
            </StyledStatsValue>
          </span>
        }
        {proposal.stats.total > 0 &&
          <>
            <VerticalSeparator/>
            <span className='voted-yes'>
              <StyledStakeTitle>Voting results</StyledStakeTitle>
              <StyledStatsValue>
                <span className='yes'>YES</span> ({calcVotingPower(proposal.stats.variants[1], proposal.stats.total)}%)
                <span className='no'>NO</span> ({calcVotingPower(proposal.stats.variants[0], proposal.stats.total)}%)
              </StyledStatsValue>
            </span>
          </> 
        }
      </StyledStats>
      <StyledHorSeparator/>
      <div className='content'>
        <div className='description'>{proposal.data.description}</div>
        {
          proposal.data.ref_link.length > 0 && 
          <>
            <div className='ref-title'>References</div>
            <div className='ref-link' onClick={() => {openInNewTab(proposal.data.forum_link)}}>
                <span>{proposal.data.ref_link}</span>
                <IconExternalLink className='icon-link'/>
            </div>
          </>
        }
      </div>
    </ContentStyled>
  );
};

const PrevProposalContent: React.FC<ProposalContentProps> = (
  {proposal, state, callback, isChangeProcessActive, onDisableChangeProcessState}
) => {
  const userViewData = useSelector(selectUserView());
  const totalsView = useSelector(selectTotalsView());
  const [isVoted, setIsVoted] = useState(false);
  const [isQuorumPassed, setQuorumPassed] = useState(false);
  const transactions = useSelector(selectTransactions());
  const [isVoteInProgress, setVoteInProgress] = useState(false);

  useEffect(() => {
    if (proposal.voted !== undefined && proposal.voted < 255) {
      setIsVoted(true);
    }

    if (proposal.data.quorum !== undefined && 
      (proposal.data.quorum.type === 'beamx' ? (proposal.stats.variants[1] >= toGroths(proposal.data.quorum.value)) : 
      ((proposal.stats.variants[1] / totalsView.stake_active) * 100 >= proposal.data.quorum.value))) {
        setQuorumPassed(true);
    }

    const activeVotes = localStorage.getItem('votes');
    
    if (activeVotes) {
      const votes = [...(JSON.parse(activeVotes).votes)];

      const currentProposal = votes.find((item) => {
        return item.id === proposal.id;
      });

      if (currentProposal) {
        const isInProgress = transactions.find((tx) => {
          return tx.txId === currentProposal.txid && tx.status === 5;
        });

        setVoteInProgress(!!isInProgress);
        
        if (!isInProgress) {
          const updatedVotes = votes.filter(function(item){ 
            return item.id !== proposal.id;
          });

          localStorage.setItem('votes', JSON.stringify({votes: updatedVotes}));
        }
      }
    }
  }, [proposal]);

  return (
    <ContentStyled>
      { proposal.prevVoted && proposal.prevVoted.value < 255 ?
      <div className='voted-controls'>
          { proposal.prevVoted.value === 1 ? 
            (<span>
              <IconVotedYes/>
              <span className='voted-yes'>You voted YES</span>
            </span>) : 
            (<span>
              <IconVotedNo/>
              <span className='voted-no'>You voted NO</span>
            </span>)
          }
          <div className='voted-cant'>The epoch #{proposal.epoch} is finished. You can’t change your decision.</div>
      </div> : 
      <div className='voted-finished'>
        The epoch #{proposal.epoch} is finished. You hadn’t voted.
      </div>
      }
      <VotingBar active={proposal.prevVoted && proposal.prevVoted.value < 255}
        value={proposal.stats.variants[1]}
        percent={proposal.stats.variants[1] / proposal.stats.total * 100}
        voteType='yes'/>
      <VotingBar active={proposal.prevVoted && proposal.prevVoted.value < 255}
        value={proposal.stats.variants[0]}
        percent={proposal.stats.variants[0] / proposal.stats.total * 100}
        voteType='no'/>
      <StyledStats>
        <span className='total'>
          <StyledStakeTitle>Total staked</StyledStakeTitle>
          <StyledStatsValue>{numFormatter(fromGroths(totalsView.stake_active))} BEAMX</StyledStatsValue>
        </span>
       <span className='voted'>
            <StyledStakeTitle>Voted</StyledStakeTitle>
            <StyledStatsValue>{numFormatter(fromGroths(proposal.stats.total))} BEAMX</StyledStatsValue>
        </span>
        <span className='staked'>
          <StyledStakeTitle>Your staked</StyledStakeTitle>
          <StyledStatsValue>{numFormatter(fromGroths(userViewData.stake_active))} BEAMX</StyledStatsValue>
        </span>
        {
          proposal.data.quorum !== undefined && 
          <span className='quorum'>
            <StyledStakeTitle>Quorum</StyledStakeTitle>
            <StyledStatsValue>
              { proposal.data.quorum.type === 'beamx' ? 
                (numFormatter(proposal.data.quorum.value) + ' BEAMX') :
                (proposal.data.quorum.value + '%') }
              { isQuorumPassed ? <IconQuorumApprove className={QuorumIconClass}/> : <IconQuorumAlert className={QuorumIconClass}/>}
            </StyledStatsValue>
          </span>
        }
        {proposal.stats.total > 0 &&
          <>
            <VerticalSeparator/>
            <span className='voted-yes'>
              <StyledStakeTitle>Voting results</StyledStakeTitle>
              <StyledStatsValue>
                <span className='yes'>YES</span> ({calcVotingPower(proposal.stats.variants[1], proposal.stats.total)}%)
                <span className='no'>NO</span> ({calcVotingPower(proposal.stats.variants[0], proposal.stats.total)}%)
              </StyledStatsValue>
            </span>
          </> 
        }
      </StyledStats>
      <StyledHorSeparator/>
      <div className='content'>
        <div className='description'>{proposal.data.description}</div>
        {
          proposal.data.ref_link.length > 0 && 
          <>
            <div className='ref-title'>References</div>
            <div className='ref-link' onClick={() => {openInNewTab(proposal.data.forum_link)}}>
                <span>{proposal.data.ref_link}</span>
                <IconExternalLink className='icon-link'/>
            </div>
          </>
        }
      </div>
    </ContentStyled>
  );
};

const FutureProposalContent: React.FC<ProposalContentProps> = (
  {proposal, state}
) => {
  const appParams = useSelector(selectAppParams());
  const userViewData = useSelector(selectUserView());
  const totalsView = useSelector(selectTotalsView());

  return (
    <ContentStyled>
      { proposal.data &&
        <div className='content'>
          <div className='epoch-comes'>The voting will be active when epoch #{appParams.current.iEpoch + 1} comes.</div>
          <div className='stake-info'>
            <span className='total'>
              <StyledStakeTitle>Total staked</StyledStakeTitle>
              <div className='value'>
                {numFormatter(fromGroths(totalsView.stake_passive + totalsView.stake_active))} BEAMX
              </div>
            </span>
            <span className='other'>
              <StyledStakeTitle>Your staked</StyledStakeTitle>
              <div className='value'>
                {numFormatter(fromGroths(userViewData.stake_passive + userViewData.stake_active))} BEAMX
              </div>
            </span>
            { 
              proposal.data.quorum !== undefined &&
              <span className='other'>
                <StyledStakeTitle>Votes quorum</StyledStakeTitle>
                <div className='value'>
                  { proposal.data.quorum.type === 'percent' ? 
                    (proposal.data.quorum.value + '%') :
                    (numFormatter(proposal.data.quorum.value) + ' BEAMX') }
                </div>
              </span>
            }
          </div>
          <div className='separator'></div>
          <div className='description'>{proposal.data.description}</div>
          {
            proposal.data.ref_link.length > 0 && 
            <>
              <div className='ref-title'>References</div>
              <div className='ref-link' onClick={() => {openInNewTab(proposal.data.forum_link)}}>
                  <span>{proposal.data.ref_link}</span>
                  <IconExternalLink className='icon-link'/>
              </div>
            </>
          }
        </div>
      }
    </ContentStyled>
  );
}


const ProposalPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const rate = useSelector(selectRate());
  const location = useLocation();
  const [isChangeVisible, setChangePopupState] = useState(false);
  const [isChangeActive, setChangeProcessState] = useState(false);

  useEffect(() => {
    if (!rate) {
      dispatch(loadRate.request());
    }
  }, [dispatch, rate]);

  const params = useParams();
  const state = location.state as locationProps;
  const proposal = useSelector(selectProposal(state.id, state.type));
  
  const handlePrevious: React.MouseEventHandler = () => {
    if (state.type === PROPOSALS.CURRENT) {
      navigate(ROUTES.MAIN.EPOCHS);
    } else if (state.type === PROPOSALS.FUTURE) {
      navigate(ROUTES.MAIN.FUTURE_EPOCHS);
    } else if (state.type === PROPOSALS.PREV) {
      navigate(ROUTES.MAIN.PREVIOUS_EPOCHS);
    }
  };

  const ContentComponent = {
    current: CurrentProposalContent,
    future: FutureProposalContent,
    prev: PrevProposalContent
  }[state.type];

  const getDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const yearString = date.toLocaleDateString(undefined, { year: 'numeric' });
    const monthString = date.toLocaleDateString(undefined, { month: 'numeric' });
    const dayString = date.toLocaleDateString(undefined, { day: 'numeric' });
    return `${dayString}.${'0' + monthString.slice(-2)}.${yearString}`;
  };

  return (
    <>
      <Window onPrevious={handlePrevious}>
        <EpochStatsSection
          state='none'
          className={StatsSectionClass}></EpochStatsSection>
        <Proposal>
          <HeaderStyled>
            <div className='id-section'>#{getProposalId(proposal.id)}</div>
            <div className='middle-section'>
              <div className='title'>{proposal.data.title}</div>
              <div className='forum-link' onClick={() => {openInNewTab(proposal.data.forum_link)}}>
                <span>Open forum discussion</span>
                <IconExternalLink className='icon-link'/>
              </div>
            </div>
            { proposal.data.timestamp ? <div className='date-section'>
              {getDate(proposal.data.timestamp)}
            </div> : null }
          </HeaderStyled>
          <ContentComponent isChangeProcessActive={isChangeActive}
            onDisableChangeProcessState={()=>setChangeProcessState(false)}
            callback={()=>{setChangePopupState(true)}} proposal={proposal} state={state}/>
        </Proposal>
      </Window>
      <ChangeDecisionPopup voted={proposal.voted !== undefined ? proposal.voted : null}
        onChangeResult={(res)=>{setChangeProcessState(res)}}
        visible={isChangeVisible} onCancel={()=>{setChangePopupState(false)}}/>
    </>
  );
};

export default ProposalPage;
