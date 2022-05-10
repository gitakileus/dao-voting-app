import React, { useEffect, useState } from 'react';
import { css } from '@linaria/core';
import { styled } from '@linaria/react';
import { IconEpochSelector, IconSearch, IconNoProposals, IconVotedYes, IconVotedNo } from '@app/shared/icons';
import { ProcessedProposal } from '@app/core/types';
import { useNavigate } from 'react-router-dom';
import { PROPOSALS, ROUTES } from '@app/shared/constants';
import { useSelector } from 'react-redux';
import { selectIsLoaded } from '@app/shared/store/selectors';
import { fromGroths, numFormatter } from '@core/appUtils';
import { selectAppParams, selectPrevEpoches } from '../../store/selectors';
import { getProposalId } from '@core/appUtils';
import Select, { Option } from '@app/shared/components/Select';

interface ListProps {
  data: ProcessedProposal[];
  extendedData?: ProcessedProposal[];
  title: string;
  type: string;
  isFuture?: boolean;
  filter?: number;
}

const ProposalsHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;

    > .icon-search-class {
        margin-left: auto;
        cursor: pointer;
    }

    > .selector-class {
        margin-left: 34px;
        font-size: 12px;
    }
`;

const List = styled.ul`
    display: flex;
    flex-direction: column;
`;

const PropTitle = styled.span`
    margin-left: 20px;
    text-transform: uppercase;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 3.11111px;
`;

const SelectorItem = styled.span<{ active: boolean }>`
    padding: 4px 16px;
    border-bottom: ${({ active }) => (active ? '2px solid #00F6D2' : 'none')};
    cursor: ${({ active }) => (active ? 'default' : 'pointer')};
    color: ${({ active }) => (active ? 'var(--color-white)' : 'rgba(255, 255, 255, .3)')};
`;

const EpochSelector = styled.span`
    margin-left: 30px;
    display: flex;
    align-items: center;

    > .epoches-selector-title {
        font-size: 14px;
        color: rgba(255, 255, 255, .5);
    }

    > .epoches-selected-item {
        margin-left: 10px;
        font-size: 14px;
        font-weigth: 700;
        color: rgba(255, 255, 255, .7);
        cursor: pointer;
    }

    > .epoches-selector-icon {
        margin-left: 10px;
        cursor: pointer;
    }
`;

const ListItem = styled.li`
    background-color: rgba(255, 255, 255, .05);
    margin-top: 10px;
    border-radius: 10px;
    cursor: pointer;
    overflow: hidden;

    > .voted {
        background-color: rgba(255, 255, 255, .05);
    }
`;

const StyledItemHeader = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;

    > .proposal-id {
        font-size: 12px;
        color: rgba(255, 255, 255, .5);
    }

    > .proposal-title {
        padding-right: 10px;
        margin-left: 20px;
        font-size: 16px;
        font-weight: 700;
        max-width: 80%;
        word-wrap: break-word;
    }
`;

const StyledItemContent = styled.div`
    display: flex;
    align-items: center;
    width: 100%
    padding: 10px 20px 20px 75px;

    > .voted-no {
        margin-left: 50px;
    }
    
    > .voted-icon {
        margin-top: 15px;
        margin-left: auto;
        
        > .text {
            font-style: italic;
            font-size: 14px;
            color: #FFFFFF;
            opacity: 0.5;
        }
    }
`;

const StyledVotedTitle = styled.div`
    font-weight: 400;
    font-size: 12px;
    color: rgba(255, 255, 255, .5);
`;

const StyledVotedValue = styled.div`
    margin-top: 5px;
    font-weight: 400;
    font-size: 14px;
`;

const EmptyListClass = css`
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 80px;

    > .title-class {
        margin-top: 30px;
        font-size: 14px;
        color: rgba(255, 255, 255, .5);
    }
`;

const PendingVote = styled.div`
    margin-left: auto;
    height: 19px;
    min-width: 120px;
    text-align: center;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 14px;
    padding: 1px 10px;
    font-weight: 400;
    font-size: 14px;
`;

const StyledEpochTitle = styled.div`
    font-weight: 700;
    font-size: 14px;
    color: rgba(255, 255, 255, .5);
    text-transform: uppercase;
    letter-spacing: 3.11px;
    margin-top: 20px;
    margin-bottom: 10px;
    margin-left: 20px;
`;

const StyledPrevStatus = styled.div<{status: boolean}>`
    height: 14px;
    width: 100%;
    text-align: center;
    font-style: italic;
    font-weight: 400;
    font-size: 12px;
    color: ${({ status }) => (status ? '#39FDF2' : '#FF746B')};
    background-color: ${({ status }) => (status ? 'rgba(57, 253, 242, .2)' : 'rgba(255, 116, 107, .2)')};
`;

const LabelStyled = styled.div`
  display: inline-block;
  vertical-align: bottom;
  line-height: 26px;
`;

const selectClassName = css`
  align-self: flex-start;
`;

const ProposalsList: React.FC<ListProps> = ({ 
  data,
  extendedData = [],
  title,
  type,
  filter = null
}) => {
    const navigate = useNavigate();
    const isLoaded = useSelector(selectIsLoaded());
    const appParams = useSelector(selectAppParams());
    const prevEpoches = useSelector(selectPrevEpoches());

    const selectorData = [
        {
            id: 0,
            title: 'ALL'
        },
        {
            id: 1,
            title: 'AWAITING YOUR VOTE'
        },
        {
            id: 2,
            title: 'YOUR VOTES'
        }
    ];

    const [filterItems, setFilterItems] = useState([]);
    const [activeFilter, setActiveFilter] = useState(null);
    useEffect(() => {
        if (type === PROPOSALS.CURRENT) {
            setFilterItems([appParams.current.iEpoch]);
            setActiveFilter(appParams.current.iEpoch); 
        } else if (type === PROPOSALS.FUTURE) {
            setFilterItems([appParams.current.iEpoch + 1]);
            setActiveFilter(appParams.current.iEpoch + 1);
        } else if (type === PROPOSALS.PREV) {
            setFilterItems(prevEpoches);
            setActiveFilter(prevEpoches[0]);
        }
    }, []);

    const [selectorActiveItem, setSelectorItem] = useState(selectorData[0]);
    const [items, setItems] = useState([]);
    const [extendedEpochs, setExtendedEpochs] = useState([]);
    const [extendedFilteredEpochs, setExtendedFilteredEpochs] = useState([]);

    useEffect(() => {
        if (type === PROPOSALS.CURRENT) {
            setFilterItems([appParams.current.iEpoch, ...prevEpoches]);
        } else if (type === PROPOSALS.PREV) {
            setFilterItems(prevEpoches);
        }
    }, [prevEpoches]);

    useEffect(() => {
        if (filter) {
            setActiveFilter(filter);
            const filteredExt = extendedEpochs.filter((item) => {
                return item === filter;
            });
            setExtendedFilteredEpochs(filteredExt);
        }
    }, [filter]);

    useEffect(() => {
        const fitleredData = data.filter((item) => {
            if (selectorActiveItem.id === selectorData[0].id || 
            (selectorActiveItem.id === selectorData[1].id && (item.voted === undefined || item.voted === 255)) ||
            (selectorActiveItem.id === selectorData[2].id && (item.voted !== undefined && item.voted < 255))) {
                return item;
            }
        })

        if (type === PROPOSALS.CURRENT) {
            fitleredData.sort(function (a, b) {
                if (a.voted < b.voted) {
                  return 1;
                }
                if (a.voted > b.voted) {
                  return -1;
                }
                // a должно быть равным b
                return 0;
              });
        }

        setItems(fitleredData);
    }, [data, selectorActiveItem]);

    useEffect(() => {
        let epochsIDs = [];
        extendedData.map((item) => {
            epochsIDs.push(item.epoch);
        });
        const onlyUnique = (value, index, self) => {
            return self.indexOf(value) === index;
        }
        let unique = epochsIDs.filter(onlyUnique);
        setExtendedEpochs(unique);

        if (filter) {
            const filteredExt = unique.filter((item) => {
                return item === filter;
            });
            setExtendedFilteredEpochs(filteredExt);
        } else {
            setExtendedFilteredEpochs(unique);
        }
    }, [appParams]);

    const handleSelectorClick: React.MouseEventHandler<HTMLLIElement> = ({ currentTarget }) => {
        setSelectorItem(selectorData[currentTarget.dataset.index]);
    };
    
    const handleSearchClick = () => {

    };

    const handleSelect = (next: number) => {
        setActiveFilter(next);
        navigate(ROUTES.MAIN.PREVIOUS_EPOCHS, {state: {filter: next}});
    };

    const handleListItemClick = (id: number, index: number) => {
        navigate(ROUTES.MAIN.PROPOSAL_PAGE, {state: {id, type, index}});
    }

    return (<div>
        <ProposalsHeader>
            <PropTitle>{ title }</PropTitle>
            { type !== PROPOSALS.FUTURE ?
            (<div className='selector-class'>
                {selectorData.map((item, index) => (
                    <SelectorItem key={index} active={selectorActiveItem.id === item.id} 
                    data-index={index} onClick={handleSelectorClick}>
                        {item.title}
                    </SelectorItem>
                ))}
            </div>) : null}
            <IconSearch className='icon-search-class' onClick={handleSearchClick}/>
            {
                //fail on new epoch 
                filterItems.length > 0 &&
                <Select value={activeFilter} className={selectClassName} onSelect={handleSelect}>
                    {filterItems.map((epoch) => (
                        <Option key={epoch} value={epoch}>
                            <LabelStyled>{epoch}</LabelStyled>
                        </Option>
                    ))}
                </Select>
            }
        </ProposalsHeader>

        { type === PROPOSALS.CURRENT && 
            <StyledEpochTitle>
                Epoch #{appParams.current.iEpoch} (current)
            </StyledEpochTitle>
        }

        { 
            items.length > 0 ?
            (<List>
                { items.map((item, index) =>
                    !!item.data && 
                    <ListItem data-index={index} key={index} onClick={() => handleListItemClick(item.id, index)}>
                        <StyledItemHeader className={item.voted !== undefined && item.voted < 255 ? 'voted' : ''}>
                            <span className='proposal-id'>#{getProposalId(item.id)}</span>
                            <span className='proposal-title'>{item.data.title}</span>

                            { type !== PROPOSALS.FUTURE && (item.voted === undefined || item.voted !== undefined && item.voted == 255) ? 
                                <PendingVote>pending vote</PendingVote> : null}
                        </StyledItemHeader>
                        { type !== PROPOSALS.FUTURE && item.voted !== undefined && item.voted < 255 ? (<StyledItemContent>
                            <span className='voted-yes'>
                                <StyledVotedTitle>Voted YES</StyledVotedTitle>
                                <StyledVotedValue>{numFormatter(fromGroths(item.stats.variants[1]))} BEAMX</StyledVotedValue>
                            </span>
                            <span className='voted-no'>
                                <StyledVotedTitle>Voted NO</StyledVotedTitle>
                                <StyledVotedValue>{numFormatter(fromGroths(item.stats.variants[0]))} BEAMX</StyledVotedValue>
                            </span>
                            <span className='voted-icon'>
                                { item.voted !== undefined && item.voted === 1 ? <IconVotedYes/> : <IconVotedNo/> }
                            </span>
                        </StyledItemContent>) : null}
                    </ListItem>
                )}
            </List>) :
            (isLoaded && (type !== PROPOSALS.PREV || (type === PROPOSALS.PREV && selectorActiveItem.id !== selectorData[0].id)) && 
                <div className={EmptyListClass}>
                    <IconNoProposals/>
                    <div className='title-class'>There are no proposals</div>
                </div>
            )
        }

        {   selectorActiveItem.id === selectorData[0].id &&
            type === PROPOSALS.PREV && extendedData.length > 0 && 
            extendedFilteredEpochs.map((extEpoch, extIndex) =>
            <div key={extIndex}> 
                <StyledEpochTitle>
                    Epoch #{extEpoch}
                </StyledEpochTitle>

                <List>
                    { extendedData.map((item, index) =>
                        !!item.data && item.epoch === extEpoch && 
                        <ListItem data-index={index} key={index} onClick={() => handleListItemClick(item.id, index)}>
                            {
                                type === PROPOSALS.PREV && 
                                <StyledPrevStatus status={item['is_passed']}>
                                    {item['is_passed'] ? 'Proposal successfully passed' : 'Proposal failed'}
                                </StyledPrevStatus>
                            }
                            <StyledItemHeader className='voted'>
                                <span className='proposal-id'>#{getProposalId(item.id)}</span>
                                <span className='proposal-title'>{item.data.title}</span>
                            </StyledItemHeader>
                            <StyledItemContent>
                                {item.stats && item.stats.variants !== undefined && 
                                    <>
                                        <span className='voted-yes'>
                                            <StyledVotedTitle>Voted YES</StyledVotedTitle>
                                            <StyledVotedValue>{numFormatter(fromGroths(item.stats.variants[1]))} BEAMX</StyledVotedValue>
                                        </span>
                                        <span className='voted-no'>
                                            <StyledVotedTitle>Voted NO</StyledVotedTitle>
                                            <StyledVotedValue>{numFormatter(fromGroths(item.stats.variants[0]))} BEAMX</StyledVotedValue>
                                        </span>
                                    </>
                                }
                                <span className='voted-icon'>
                                    {
                                        item.prevVoted && item.prevVoted.value !== 255 ? 
                                        (item.prevVoted.value === 1 ? <IconVotedYes/> : <IconVotedNo/>) :
                                        <div className='text'>The epoch #{item.epoch} is finished. You hadn’t voted.</div>
                                    }
                                </span>
                            </StyledItemContent>
                        </ListItem>
                    )}
                </List>
            </div>)
        }
    </div>);
};

export default ProposalsList;
