import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { bazaarController } from './bazaar-controller'

export const bazaarModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(bazaarController, { prefix: '/v1/bazaar' })
}
