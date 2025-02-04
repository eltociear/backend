import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { Role } from '../../common/user/roles';
import { GraphQLContext } from '../context';
import { AuthorizedDeferred, hasAccess } from '../authorizations';
import { getLogger } from '../../common/logger/logger';
import { prisma } from '../../common/prisma';
import { ConversationInfos, markConversationAsReadOnlyForPupils } from '../../common/chat';
import { User, getUser } from '../../common/user';
import { isSubcourseParticipant, getMatchByMatchees, getMembersForSubcourseGroupChat } from '../../common/chat/helper';
import { ChatType, ContactReason } from '../../common/chat/types';
import { createContactChat, getOrCreateGroupConversation, getOrCreateOneOnOneConversation } from '../../common/chat/create';
import { getCourseImageURL } from '../../common/courses/util';

const logger = getLogger('MutateChatResolver');
@Resolver()
export class MutateChatResolver {
    @Mutation(() => String)
    @AuthorizedDeferred(Role.OWNER)
    async matchChatCreate(@Ctx() context: GraphQLContext, @Arg('matcheeUserId') matcheeUserId: string) {
        const { user } = context;
        const matcheeUser = await getUser(matcheeUserId);
        const matchees: [User, User] = [user, matcheeUser];

        const match = await getMatchByMatchees([user.userID, matcheeUserId]);
        await hasAccess(context, 'Match', match);

        const conversationInfos: ConversationInfos = {
            custom: {
                match: { matchId: match.id },
            },
        };

        const conversation = await getOrCreateOneOnOneConversation(matchees, conversationInfos, ContactReason.MATCH);
        return conversation.id;
    }

    @Mutation(() => String)
    @Authorized(Role.USER)
    async participantChatCreate(@Ctx() context: GraphQLContext, @Arg('memberUserId') memberUserId: string, @Arg('subcourseId') subcourseId: number) {
        const { user } = context;
        const memberUser = await getUser(memberUserId);

        const allowed = await isSubcourseParticipant([user.userID, memberUserId]);
        const conversationInfos: ConversationInfos = {
            custom: {},
        };

        if (subcourseId) {
            conversationInfos.custom.subcourse = [subcourseId];
        }

        if (allowed) {
            const conversation = await getOrCreateOneOnOneConversation([user, memberUser], conversationInfos, ContactReason.PARTICIPANT, subcourseId);
            return conversation.id;
        }
        throw new Error('Participant is not allowed to create conversation.');
    }

    @Mutation(() => String)
    @AuthorizedDeferred(Role.OWNER)
    async subcourseGroupChatCreate(@Ctx() context: GraphQLContext, @Arg('subcourseId') subcourseId: number, @Arg('groupChatType') groupChatType: ChatType) {
        const subcourse = await prisma.subcourse.findUnique({
            where: { id: subcourseId },
            include: { subcourse_participants_pupil: true, subcourse_instructors_student: true, lecture: true, course: true },
        });
        await hasAccess(context, 'Subcourse', subcourse);
        const courseImage = getCourseImageURL(subcourse.course);

        const conversationInfos: ConversationInfos = {
            subject: subcourse.course.name,
            photoUrl: courseImage,
            custom: {
                start: subcourse.lecture[0].start.toISOString(),
                groupType: groupChatType,
                subcourse: [subcourseId],
            },
        };
        const subcourseMembers = await getMembersForSubcourseGroupChat(subcourse);
        const conversation = await getOrCreateGroupConversation(subcourseMembers, subcourseId, conversationInfos);
        if (groupChatType === ChatType.ANNOUNCEMENT) {
            await markConversationAsReadOnlyForPupils(conversation.id);
        }
        return conversation.id;
    }

    @Mutation(() => String)
    @Authorized(Role.PUPIL)
    async prospectChatCreate(@Ctx() context: GraphQLContext, @Arg('instructorUserId') instructorUserId: string, @Arg('subcourseId') subcourseId: number) {
        const { user: prospectUser } = context;
        const instructorUser = await getUser(instructorUserId);

        const conversationInfos: ConversationInfos = {
            custom: {},
        };

        if (subcourseId) {
            conversationInfos.custom.prospectSubcourse = [subcourseId];
        }

        const conversation = await getOrCreateOneOnOneConversation([prospectUser, instructorUser], conversationInfos, ContactReason.PROSPECT, subcourseId);

        return conversation.id;
    }

    @Mutation(() => String)
    @Authorized(Role.USER)
    async contactChatCreate(@Ctx() context: GraphQLContext, @Arg('contactUserId') contactUserId: string) {
        const { user } = context;
        const contactUser = await getUser(contactUserId);
        const contactConversationId = await createContactChat(user, contactUser);
        return contactConversationId;
    }
}
