/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Entity } from '@backstage/catalog-model';
import {
  ErrorApi,
  errorApiRef,
  IdentityApi,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { AsyncEntityProvider } from '@backstage/plugin-catalog-react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { EntityFeedbackApi, entityFeedbackApiRef } from '../../api';
import { FeedbackRatings, StarredRatingButtons } from './StarredRatingButtons';

jest.mock('../FeedbackResponseDialog', () => ({
  FeedbackResponseDialog: ({ open }: { open: boolean }) => {
    return <>{open && <span>dialog is open</span>}</>;
  },
}));

describe('StarredRatingButtons', () => {
  const sampleRatings = [
    {
      userRef: 'user:default/me',
      rating: FeedbackRatings.two,
    },
    {
      userRef: 'user:default/someone',
      rating: FeedbackRatings.five,
    },
  ];

  const testEntity = {
    kind: 'component',
    metadata: { name: 'test', namespace: 'default' },
  } as Entity;

  const errorApi: Partial<ErrorApi> = { post: jest.fn() };

  const feedbackApi: Partial<EntityFeedbackApi> = {
    getRatings: jest.fn().mockImplementation(async () => sampleRatings),
    recordRating: jest.fn().mockImplementation(() => Promise.resolve()),
  };

  const identityApi: Partial<IdentityApi> = {
    getBackstageIdentity: async () => ({
      type: 'user',
      userEntityRef: 'user:default/me',
      ownershipEntityRefs: [],
    }),
  };

  const render = async (props: any = {}) =>
    renderInTestApp(
      <TestApiProvider
        apis={[
          [entityFeedbackApiRef, feedbackApi],
          [errorApiRef, errorApi],
          [identityApiRef, identityApi],
        ]}
      >
        <AsyncEntityProvider loading={false} entity={testEntity}>
          <StarredRatingButtons {...props} />
        </AsyncEntityProvider>
      </TestApiProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the previous rating if it exists', async () => {
    await render();
    expect(feedbackApi.getRatings).toHaveBeenCalledWith(
      'component:default/test',
    );
  });

  it('applies a rating correctly', async () => {
    const rendered = await render();

    await userEvent.click(
      rendered.getByTestId('entity-feedback-star-button-3'),
    );
    expect(feedbackApi.recordRating).toHaveBeenCalledWith(
      'component:default/test',
      FeedbackRatings.three.toString(),
    );

    jest.clearAllMocks();

    await userEvent.click(
      rendered.getByTestId('entity-feedback-star-button-5'),
    );
    expect(feedbackApi.recordRating).toHaveBeenCalledWith(
      'component:default/test',
      FeedbackRatings.five.toString(),
    );
  });

  it('ignores an existing rating correctly', async () => {
    const rendered = await render();

    await userEvent.click(
      rendered.getByTestId('entity-feedback-star-button-2'),
    );
    expect(feedbackApi.recordRating).not.toHaveBeenCalled();
  });

  it('opens a response dialog if a rating under the threshold is selected', async () => {
    const rendered = await render();

    expect(rendered.queryByText('dialog is open')).toBeNull();

    await userEvent.click(
      rendered.getByTestId('entity-feedback-star-button-1'),
    );
    expect(rendered.getByText('dialog is open')).toBeInTheDocument();
  });

  it('opens a response dialog if a rating under a custom threshold is selected', async () => {
    const rendered = await render({ requestResponseThreshold: 4 });

    expect(rendered.queryByText('dialog is open')).toBeNull();

    await userEvent.click(
      rendered.getByTestId('entity-feedback-star-button-3'),
    );
    expect(rendered.getByText('dialog is open')).toBeInTheDocument();
  });

  it('does not open a response dialog if configured not to', async () => {
    const rendered = await render({ requestResponse: false });

    expect(rendered.queryByText('dialog is open')).toBeNull();

    await userEvent.click(
      rendered.getByTestId('entity-feedback-star-button-1'),
    );
    expect(rendered.queryByText('dialog is open')).toBeNull();
  });
});
