import { ActivepiecesError, ErrorCode, isNil, PrincipalType, PlatformRole } from '@activepieces/shared';
import { cryptoUtils } from '@activepieces/server-shared'
import { FastifyRequest } from 'fastify';
import { BaseSecurityHandler } from '../security-handler';
import { JwtSignAlgorithm, jwtUtils } from '../../../helper/jwt-utils';
import { repoFactory } from '../../db/repo-factory';
import { ProjectEntity } from '../../../project/project-entity';
import { userService } from '../../../user/user-service'
import { projectService } from '../../../project/project-service'
import { platformService } from '../../../platform/platform.service'

export class BazaarSupabaseAuthnHandler extends BaseSecurityHandler {
    private static readonly HEADER_NAME = 'authorization'
    private static readonly HEADER_PREFIX = 'Bearer '

    protected async canHandle(request: FastifyRequest): Promise<boolean> {
        const header = request.headers[BazaarSupabaseAuthnHandler.HEADER_NAME]
        const prefix = BazaarSupabaseAuthnHandler.HEADER_PREFIX
        const routeMatches = header?.startsWith(prefix) ?? false
        let issuerMatch = false
        const skipAuth = request.routeConfig.skipAuth
        try {
          const accessToken = this.extractAccessTokenOrThrow(request)
          const principal = await this.extractPrincipal(accessToken)
          issuerMatch = principal.iss.includes('supabase')
        } catch(e) {
        }

        return routeMatches && issuerMatch && !skipAuth
    }

    protected async doHandle(request: FastifyRequest): Promise<void> {
        const accessToken = this.extractAccessTokenOrThrow(request)
        const principal = await this.extractPrincipal(accessToken)

        principal.type = PrincipalType.USER
        request.principal = principal

        const projectRepo = repoFactory(ProjectEntity)
        const projects = await projectRepo().query(`
            SELECT "project"."id" AS "projectId"
            FROM "project" "project"
                   INNER JOIN "user" "user" ON "user"."id" = project."ownerId"
            WHERE ("user"."externalId" = '${principal.sub}')
              AND ("project"."deleted" IS NULL)
        `)
        if(Array.isArray(projects) && projects.length) {
            principal.projectId = projects[0].projectId
        } else {
            // find platform id
            const [platform, password] = await Promise.all([
                platformService.getOldestPlatform(),
                cryptoUtils.generateRandomPassword()
            ])
            // create user
            const user = await userService.create({
                email: principal.email,
                password,
                verified: true,
                // @ts-ignore
                platformId: platform?.id,
                externalId: principal.sub,
                platformRole: PlatformRole.MEMBER,
                firstName: 'NAME',
                lastName: 'LAST',
                trackEvents: true,
                newsLetter: false
            })
            // create project
            const project = await projectService.create({
              ownerId: user.id,
              displayName: `${principal.sub}'s Project`,
              // @ts-ignore
              platformId: platform?.id,
            })
            principal.projectId = project.id
        }
    }

    private extractAccessTokenOrThrow(request: FastifyRequest): string {
        const header = request.headers[BazaarSupabaseAuthnHandler.HEADER_NAME]
        const prefix = BazaarSupabaseAuthnHandler.HEADER_PREFIX
        const accessToken = header?.substring(prefix.length)

        if (isNil(accessToken)) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHENTICATION,
                params: {
                    message: 'missing access token',
                },
            })
        }

        return accessToken
    }

    private async extractPrincipal(token: string): Promise<any> {
      try {
        return await jwtUtils.decodeAndVerify<any>({
            jwt: token,
            algorithm: JwtSignAlgorithm.HS256,
            // @ts-ignore
            key: process.env.BAZAAR_JWT_SECRET,
            issuer: process.env.BAZAAR_JWT_ISSUER
          })
      }
      catch (e) {
          throw new ActivepiecesError({
              code: ErrorCode.INVALID_BEARER_TOKEN,
              params: {
                  message: 'invalid access token',
              },
          })
      }
  }
}
