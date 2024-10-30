import { createTrigger, PieceAuth, Property, TriggerStrategy } from '@activepieces/pieces-framework';

export const bazaarEvents = createTrigger({
  name: 'bazaarEvents',
  displayName: 'Bazaar Events',
  description: '',
  props: {
    type: Property.StaticDropdown({
      displayName: 'Event',
      // todo add description: 'The type of the item to trigger a webhook',
      required: true,
      options: {
        options: [
          // todo load events dynamically
          { label: 'Listing Created', value: 'listing.created' },
          { label: 'Listing Approved', value: 'listing.approved' },
          { label: 'Vendor Account Created', value: 'vendor.account.created' },
          { label: 'User Created', value: 'user.created' }
        ]
      }
    })
  },
  sampleData: {},
  type: TriggerStrategy.APP_WEBHOOK,
  auth: PieceAuth.None(),
  requireAuth: false,
  async onEnable(context) {
    const externalProjectId = await context.project.externalId();
    if (!externalProjectId) {
      throw new Error('External Project ID is undefined!');
    }
    context.app.createListeners({
      events: [context.propsValue['type']],
      identifierValue: externalProjectId
    });
  },

  async onDisable() {
  },

  async run(context) {
    return [context.payload.body];
  }
});
