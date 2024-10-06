import { FastifyPluginCallbackTypebox, Type } from '@fastify/type-provider-typebox'

export const bazaarController: FastifyPluginCallbackTypebox = (
    fastify,
    _opts,
    done,
) => {
    fastify.get('/project-id', async (request) => {
        return request.principal.projectId;
    })
    done()
}
