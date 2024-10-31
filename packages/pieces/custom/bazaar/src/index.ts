import { createPiece, PieceAuth } from '@activepieces/pieces-framework';
import { bazaarEvents } from './lib/triggers/bazaar-events';
import { ParseEventResponse } from '@activepieces/shared';

export const bazaar = createPiece({
  displayName: 'Bazaar',
  auth: PieceAuth.None(),
  logoUrl: 'https://ik.imagekit.io/bazaarhq/logo/logo.svg',
  authors: [],
  actions: [],
  triggers: [bazaarEvents],
  events: {
    parseAndReply: ({ payload }): ParseEventResponse => {
      const payloadBody = payload.body as {
        type: string;
        data: {
          record: object,
          old_record: object,
          user_id: string
        }
      };
      return {
        event: payloadBody?.type,
        identifierValue: payloadBody?.data?.user_id
      };
    },
    verify: ({ webhookSecret, payload }) => {
      return payload.queryParams['secret'] === webhookSecret;
    }
  }
});
