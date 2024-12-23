import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { ChannelTypeEnum, UpdateSubscriberGlobalPreferencesRequestDto } from '@novu/api/models/components';
import axios from 'axios';
import { PreferenceChannels } from '@novu/api/src/models/components/preferencechannels';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Update Subscribers global preferences - /subscribers/:subscriberId/preferences (PATCH)', function () {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  it('should validate the payload', async function () {
    const badPayload = {
      enabled: true,
      preferences: false,
    };

    try {
      const firstResponse = await updateGlobalPreferences(badPayload as any, session);
      expect(firstResponse).to.not.be.ok;
    } catch (error) {
      expect(error.toJSON()).to.have.include({
        status: 400,
        name: 'AxiosError',
        message: 'Request failed with status code 400',
      });
    }

    const yetAnotherBadPayload = {
      enabled: 'hello',
      preferences: [{ type: ChannelTypeEnum.Email, enabled: true }],
    };

    try {
      const secondResponse = await updateGlobalPreferences(yetAnotherBadPayload as any, session);
      expect(secondResponse).to.not.be.ok;
    } catch (error) {
      expect(error.toJSON()).to.have.include({
        status: 400,
        name: 'AxiosError',
        message: 'Request failed with status code 400',
      });
    }
  });

  it('should update user global preferences', async function () {
    const payload = {
      enabled: true,
      preferences: [{ type: ChannelTypeEnum.Email, enabled: true }],
    };

    const response = await novuClient.subscribers.preferences.updateGlobal(payload, session.subscriberId);

    expect(response.result.preference.enabled).to.eql(true);
    expect(response.result.preference.channels).to.not.eql({
      [ChannelTypeEnum.InApp]: true,
    });
    expect(response.result.preference.channels).to.eql({
      email: true,
      sms: true,
      inApp: true,
      chat: true,
      push: true,
    } as PreferenceChannels);
  });

  it('should update user global preferences for multiple channels', async function () {
    const payload = {
      enabled: true,
      preferences: [
        { type: ChannelTypeEnum.Push, enabled: false },
        { type: ChannelTypeEnum.InApp, enabled: false },
        { type: ChannelTypeEnum.Sms, enabled: true },
      ],
    };

    const response = await novuClient.subscribers.preferences.updateGlobal(payload, session.subscriberId);

    expect(response.result.preference.enabled).to.eql(true);
    expect(response.result.preference.channels).to.deep.eq({
      email: true,
      push: false,
      chat: true,
      sms: true,
      inApp: false,
    } as PreferenceChannels);
  });
});

// This is kept in order to validate the server controller behavior as the SDK will not allow problematic payloads in compilation
export async function updateGlobalPreferences(data: UpdateSubscriberGlobalPreferencesRequestDto, session: UserSession) {
  const axiosInstance = axios.create();

  return await axiosInstance.patch(`${session.serverUrl}/v1/subscribers/${session.subscriberId}/preferences`, data, {
    headers: {
      authorization: `ApiKey ${session.apiKey}`,
    },
  });
}
