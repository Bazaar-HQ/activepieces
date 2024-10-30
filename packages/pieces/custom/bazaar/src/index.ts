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
        event: string;
        user_id: string;
      };
      return {
        event: payloadBody?.event,
        identifierValue: payloadBody?.user_id
      };
    },
    verify: ({ webhookSecret, payload }) => {
      return payload.queryParams['secret'] === webhookSecret;
    }
  }
});
