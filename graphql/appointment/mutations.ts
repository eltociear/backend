import { Arg, Ctx, Field, InputType, Mutation, Resolver, Int, Authorized } from 'type-graphql';
import { Lecture as Appointment } from '../generated';
import { Role } from '../../common/user/roles';
import {
    AppointmentCreateGroupInput,
    AppointmentCreateMatchInput,
    createGroupAppointments,
    createMatchAppointments,
    createZoomMeetingForAppointment,
    isAppointmentOneWeekLater,
    saveZoomMeetingReport,
} from '../../common/appointment/create';
import { GraphQLContext } from '../context';
import { AuthorizedDeferred, hasAccess } from '../authorizations';
import { prisma } from '../../common/prisma';
import { Doc, getLecture, getStudent } from '../util';
import { getLogger } from '../../common/logger/logger';
import { deleteZoomMeeting } from '../../common/zoom/scheduled-meeting';
import { declineAppointment } from '../../common/appointment/decline';
import { updateAppointment } from '../../common/appointment/update';
import { cancelAppointment } from '../../common/appointment/cancel';
import { PrerequisiteError, RedundantError } from '../../common/util/error';
import { GraphQLInt } from 'graphql';

const logger = getLogger('MutateAppointmentsResolver');

@InputType()
class AppointmentUpdateInput {
    @Field(() => Int)
    id: number;
    @Field(() => String, { nullable: true })
    title?: string;
    @Field(() => String, { nullable: true })
    description?: string;
    @Field(() => Date, { nullable: true })
    start?: Date;
    @Field(() => Int, { nullable: true })
    duration?: number;
}
@Resolver(() => Appointment)
export class MutateAppointmentResolver {
    @Mutation(() => Boolean)
    @AuthorizedDeferred(Role.OWNER)
    async appointmentMatchCreate(@Ctx() context: GraphQLContext, @Arg('appointment') appointment: AppointmentCreateMatchInput) {
        const match = await prisma.match.findUnique({ where: { id: appointment.matchId }, include: { pupil: true } });
        await hasAccess(context, 'Match', match);
        await createMatchAppointments(match.id, [appointment]);

        return true;
    }

    @Mutation(() => Boolean)
    @AuthorizedDeferred(Role.OWNER)
    async appointmentsMatchCreate(
        @Ctx() context: GraphQLContext,
        @Arg('matchId') matchId: number,
        @Arg('appointments', () => [AppointmentCreateMatchInput]) appointments: AppointmentCreateMatchInput[]
    ) {
        const match = await prisma.match.findUnique({ where: { id: matchId }, include: { pupil: true } });
        await hasAccess(context, 'Match', match);
        await createMatchAppointments(matchId, appointments);

        return true;
    }

    @Mutation(() => Boolean)
    @AuthorizedDeferred(Role.OWNER)
    async appointmentGroupCreate(@Ctx() context: GraphQLContext, @Arg('appointment') appointment: AppointmentCreateGroupInput) {
        const subcourse = await prisma.subcourse.findUnique({ where: { id: appointment.subcourseId }, include: { course: true } });
        const organizer = await getStudent(context.user.studentId);
        await hasAccess(context, 'Subcourse', subcourse);
        await createGroupAppointments(subcourse.id, [appointment], organizer);

        return true;
    }

    @Mutation(() => Boolean)
    @AuthorizedDeferred(Role.OWNER)
    async appointmentsGroupCreate(
        @Ctx() context: GraphQLContext,
        @Arg('subcourseId') subcourseId: number,
        @Arg('appointments', () => [AppointmentCreateGroupInput]) appointments: AppointmentCreateGroupInput[]
    ) {
        const subcourse = await prisma.subcourse.findUnique({ where: { id: subcourseId }, include: { course: true } });
        const organizer = await getStudent(context.user.studentId);

        await hasAccess(context, 'Subcourse', subcourse);
        if (!isAppointmentOneWeekLater(appointments[0].start)) {
            throw new PrerequisiteError('Appointment can not be created, because start is not one week later.');
        }

        await createGroupAppointments(subcourseId, appointments, organizer);
        return true;
    }

    @Mutation(() => Boolean)
    @AuthorizedDeferred(Role.OWNER)
    async appointmentUpdate(@Ctx() context: GraphQLContext, @Arg('appointmentToBeUpdated') appointmentToBeUpdated: AppointmentUpdateInput) {
        const appointment = await getLecture(appointmentToBeUpdated.id);
        await hasAccess(context, 'Lecture', appointment);
        await updateAppointment(context.user, appointment, appointmentToBeUpdated);

        return true;
    }

    @Mutation(() => Boolean)
    @AuthorizedDeferred(Role.OWNER, Role.APPOINTMENT_PARTICIPANT)
    async appointmentDecline(@Ctx() context: GraphQLContext, @Arg('appointmentId') appointmentId: number) {
        const appointment = await getLecture(appointmentId);
        await hasAccess(context, 'Lecture', appointment);
        await declineAppointment(context.user, appointment);

        return true;
    }

    @Mutation(() => Boolean)
    @AuthorizedDeferred(Role.OWNER)
    async appointmentCancel(@Ctx() context: GraphQLContext, @Arg('appointmentId') appointmentId: number) {
        const appointment = await getLecture(appointmentId);
        await hasAccess(context, 'Lecture', appointment);

        await cancelAppointment(context.user, appointment, false);

        return true;
    }

    @Mutation(() => Boolean)
    @AuthorizedDeferred(Role.OWNER)
    async appointmentSaveMeetingReport(@Ctx() context: GraphQLContext, @Arg('appointmentId') appointmentId: number) {
        const appointment = await getLecture(appointmentId);
        await hasAccess(context, 'Lecture', appointment);
        await saveZoomMeetingReport(appointment);

        return true;
    }

    @Mutation(() => Boolean)
    @Authorized(Role.ADMIN)
    async appointmentDeleteZoomMeeting(@Ctx() context: GraphQLContext, @Arg('appointmentId') appointmentId: number) {
        const appointment = await getLecture(appointmentId);
        if (!appointment.zoomMeetingId) {
            throw new RedundantError('Appointment has no Zoom Meeting');
        }

        await deleteZoomMeeting(appointment);
        logger.info(`Admin deleted Zoom Meeting of Appointment(${appointment.id})`);
        return true;
    }

    @Mutation(() => Boolean)
    @Authorized(Role.ADMIN)
    @Doc('Usually Zoom Meetings are created automatically when an appointment is scheduled. If this fails, one can recreate them manually')
    async appointmentAddZoomMeeting(@Ctx() context: GraphQLContext, @Arg('appointmentId', () => GraphQLInt) appointmentId: number) {
        const appointment = await getLecture(appointmentId);
        await createZoomMeetingForAppointment(appointment);
        return true;
    }
}
