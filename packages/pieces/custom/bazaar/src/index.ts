
    import { createPiece, PieceAuth } from "@activepieces/pieces-framework";
    import { createOrder } from './lib/actions/create-order';
    import { bazaarEvents } from './lib/triggers/bazaar-events';

    export const bazaarAuth = PieceAuth.SecretText({
      displayName: 'API Key',
      required: true,
      description: 'Please use **test-key** as value for API Key',
    });


    export const bazaar = createPiece({
      displayName: "Bazaar",
      auth: bazaarAuth,
      minimumSupportedRelease: '0.20.0',
      logoUrl: "https://cdn.activepieces.com/pieces/activepieces.png",
      authors: [],
      actions: [createOrder],
      triggers: [bazaarEvents],
    });
