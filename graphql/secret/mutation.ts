import { Secret } from '../generated';
import { Resolver, Mutation, Arg, Authorized, Ctx } from 'type-graphql';
import { createPassword, createToken, requestToken, revokeToken, revokeTokenByToken } from '../../common/secret';
import { GraphQLContext } from '../context';
import { getSessionUser, isAdmin } from '../authentication';
import { Role } from '../authorizations';
import { getUser, getUserByEmail } from '../../common/user';
import { RateLimit } from '../rate-limit';
import { getLogger } from '../../common/logger/logger';
import { UserInputError } from 'apollo-server-express';
import { validateEmail } from '../validators';
import { GraphQLString } from 'graphql';

const logger = getLogger('MutateSecretResolver');

@Resolver((of) => Secret)
export class MutateSecretResolver {
    @Mutation((returns) => String)
    @Authorized(Role.USER)
    async tokenCreate(@Ctx() context: GraphQLContext, @Arg('description', { nullable: true }) description: string | null) {
        return await createToken(getSessionUser(context), /* expiresAt */ null, description);
    }

    @Mutation((returns) => String)
    @Authorized(Role.ADMIN)
    async tokenCreateAdmin(@Arg('userId') userId: string, @Arg('description', { nullable: true }) description?: string) {
        const inOneWeek = new Date();
        inOneWeek.setDate(inOneWeek.getDate() + 7);

        const user = await getUser(userId);
        const token = await createToken(user, /* expiresAt */ inOneWeek, `Support ${description ?? 'Week Access'}`);
        logger.info(`Admin created a login token for User(${userId})`);
        return token;
    }

    @Mutation((returns) => Boolean)
    @Authorized(Role.USER)
    async passwordCreate(@Ctx() context: GraphQLContext, @Arg('password') password: string) {
        await createPassword(getSessionUser(context), password);
        return true;
    }

    @Mutation((returns) => Boolean)
    @Authorized(Role.USER)
    async meChangeEmail(@Ctx() context: GraphQLContext, @Arg('email') email: string) {
        const user = getSessionUser(context);
        await requestToken(user, 'user-email-change', '/start', email);
        return true;
    }

    @Mutation((returns) => Boolean)
    @Authorized(Role.USER, Role.ADMIN)
    async tokenRevoke(@Ctx() context: GraphQLContext, @Arg('id', { nullable: true }) id?: number, @Arg('token', { nullable: true }) token?: string) {
        if (id) {
            if (isAdmin(context)) {
                await revokeToken(null, id);
            } else {
                await revokeToken(getSessionUser(context), id);
            }
            return true;
        }

        if (token) {
            await revokeTokenByToken(token);
            return true;
        }

        throw new UserInputError(`Either the id or the token must be passed`);
    }

    @Mutation((returns) => Boolean)
    @Authorized(Role.UNAUTHENTICATED)
    @RateLimit('Request E-Mail Tokens', 50 /* requests per */, 5 * 60 * 60 * 1000 /* 5 hours */)
    async tokenRequest(
        @Arg('email') email: string,
        @Arg('action', () => GraphQLString, { nullable: true }) action = 'user-authenticate',
        @Arg('redirectTo', { nullable: true }) redirectTo?: string
    ) {
        const user = await getUserByEmail(validateEmail(email));

        if (!['user-authenticate', 'user-password-reset', 'user-verify-email'].includes(action)) {
            throw new UserInputError(`Unsupported Action for Token Request`);
        }

        await requestToken(user, action as any, redirectTo);
        return true;
    }
}
