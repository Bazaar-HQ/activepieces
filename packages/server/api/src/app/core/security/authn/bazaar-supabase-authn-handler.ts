import { ActivepiecesError, ErrorCode, isNil, PrincipalType, PlatformRole, Project, User } from '@activepieces/shared';
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

        if(!principal?.app_metadata?.org_id && !principal?.user_metadata?.org_id) {
          throw new ActivepiecesError({
            code: ErrorCode.AUTHENTICATION,
            params: {
              message: 'missing organization id',
            },
          })
        }

        // NOTE: we trust on the third party service that added org_id to the JWT token
        const orgId: string = principal?.app_metadata?.org_id ?? principal?.user_metadata?.org_id
        const userSub: string = principal.sub

        // NOTE: we use only one platform in Bazaar project
        const platform = await platformService.getOldestPlatform()

        if(platform) {
          const [project, user] = await Promise.all(
            [
              projectService.getByPlatformIdAndExternalId({
              platformId: platform.id,
              externalId: orgId,
              }),
              userService.getByPlatformAndExternalId({
              platformId: platform.id,
              externalId: userSub
              })
            ]
          )

          if(user) {
            principal.id = user.id
          } else {
            const password = await cryptoUtils.generateRandomPassword()

            // create user
            const newUser = await userService.create({
              email: principal.email,
              password,
              verified: true,
              // @ts-ignore
              platformId: platform.id,
              externalId: userSub,
              platformRole: PlatformRole.MEMBER,
              firstName: 'NAME',
              lastName: 'LAST',
              trackEvents: true,
              newsLetter: false
            })

            principal.id = newUser.id
          }

          if(project) {
            principal.projectId = project.id
          } else {
            // create project
            const newProject = await projectService.create({
              ownerId: principal.id,
              displayName: `${userSub}'s Project`,
              // @ts-ignore
              platformId: platform.id,
              externalId: orgId,
            })
            principal.projectId = newProject.id
          }

          principal.type = PrincipalType.USER
          principal.platform = platform
          request.principal = principal
        }
        else {
          throw new ActivepiecesError({
            code: ErrorCode.AUTHENTICATION,
            params: {
              message: 'missing platform',
            },
          })
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
