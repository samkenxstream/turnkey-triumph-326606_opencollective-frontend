import React from 'react';
import PropTypes from 'prop-types';
import { useMutation } from '@apollo/client';
import { FormattedMessage } from 'react-intl';

import { ActivityClasses, ActivityTypes } from '../../../../lib/constants/activities';
import { API_V2_CONTEXT, gqlV2 } from '../../../../lib/graphql/helpers';

import StyledSwitch from '../../../StyledSwitch';
import { TOAST_TYPE, useToasts } from '../../../ToastProvider';

import { accountActivitySubscriptionsFragment } from './fragments';

const refetchEmailNotificationQuery = gqlV2/* GraphQL */ `
  query NotificationsSettingsRefetchQuery($id: String!) {
    account(id: $id) {
      id
      ...AccountActivitySubscriptionsFields
    }
  }
  ${accountActivitySubscriptionsFragment}
`;

const toggleEmailNotificationMutation = gqlV2/* GraphQL */ `
  mutation ToggleEmailNotification($type: ActivityAndClassesType!, $account: AccountReferenceInput) {
    toggleEmailNotification(type: $type, account: $account) {
      id
    }
  }
`;

const ActivitySwitch = ({ account, activityType }) => {
  const { addToast } = useToasts();
  const existingSetting = account.activitySubscriptions?.find(
    notification =>
      ActivityClasses[activityType] === notification.type || notification.type === ActivityTypes.ACTIVITY_ALL,
  );
  const isIndeterminate =
    activityType === 'ACTIVITY_ALL' &&
    account.activitySubscriptions?.some(notification => notification.type !== ActivityTypes.ACTIVITY_ALL);
  const subscribed = existingSetting ? existingSetting.active : isIndeterminate ? false : true;
  const isOverridedByAll = activityType !== 'ACTIVITY_ALL' && existingSetting?.type === ActivityTypes.ACTIVITY_ALL;

  const [toggleEmailNotification, { loading }] = useMutation(toggleEmailNotificationMutation, {
    context: API_V2_CONTEXT,
    refetchQueries: [{ query: refetchEmailNotificationQuery, variables: { id: account.id }, context: API_V2_CONTEXT }],
  });

  const handleToggle = async variables => {
    try {
      await toggleEmailNotification({ variables });
    } catch (e) {
      addToast({
        type: TOAST_TYPE.ERROR,
        message: (
          <FormattedMessage
            id="NotificationsSettings.ToggleError"
            defaultMessage="Error updating activity {activity}: {error}"
            values={{
              activity: activityType,
              error: e.message,
            }}
          />
        ),
      });
    }
  };

  return (
    <StyledSwitch
      name={`${activityType}-switch`}
      checked={subscribed}
      isLoading={loading || isIndeterminate}
      disabled={isIndeterminate || isOverridedByAll}
      onChange={() => handleToggle({ type: activityType, account: { id: account.id } })}
    />
  );
};

ActivitySwitch.propTypes = {
  account: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    slug: PropTypes.string,
    type: PropTypes.string,
    imageUrl: PropTypes.string,
    activitySubscriptions: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        active: PropTypes.bool,
      }),
    ),
  }),
  activityType: PropTypes.string,
};

export default ActivitySwitch;
