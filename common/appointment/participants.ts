import { getLogger } from '../logger/logger';
import { prisma } from '../prisma';
import { User, userForStudent } from '../user';
import { addOrganizerToZoomMeeting, removeOrganizerFromZoomMeeting } from '../zoom/scheduled-meeting';
import { student as Student, lecture as Appointment } from '@prisma/client';
import { getOrCreateZoomUser } from '../zoom/user';

const logger = getLogger('Appointment Participants');

export async function isAppointmentParticipant(lecture: Appointment, user: User): Promise<boolean> {
    return !!(await prisma.lecture.findFirst({
        where: {
            id: lecture.id,
            participantIds: {
                has: user.userID,
            },
        },
        select: {
            id: true,
        },
    }));
}

export async function addGroupAppointmentsParticipant(subcourseId: number, userId: string) {
    for (const lecture of await prisma.lecture.findMany({ where: { subcourseId } })) {
        if (lecture.participantIds.includes(userId)) {
            logger.info(`User(${userId}) is already a participant of Appointment(${lecture.id}) of Subcourse(${subcourseId})`);
            continue;
        }

        if (lecture.organizerIds.includes(userId)) {
            throw new Error(`User(${userId}) is already an organizer of Appointment(${lecture.id}) of Subcourse(${subcourseId}), cannot add as participant`);
        }

        await prisma.lecture.update({ where: { id: lecture.id }, data: { participantIds: { push: userId } } });
        logger.info(`User(${userId}) added as participant of Appointment(${lecture.id}) of Subcourse(${subcourseId})`);
    }
}

export async function removeGroupAppointmentsParticipant(subcourseId: number, userId: string) {
    const appointments = await prisma.lecture.findMany({ where: { subcourseId, participantIds: { hasSome: userId }, start: { gte: new Date() } } });

    await Promise.all(
        appointments.map(async (a) => {
            const participants = a.participantIds;
            const newParticipants = participants.filter((pId) => pId !== userId);
            await prisma.lecture.update({
                where: { id: a.id },
                data: { participantIds: { set: newParticipants } },
            });

            logger.info(`Removed User(${userId}) from Appointment(${a.id}) of Subcourse(${subcourseId})`);
        })
    );
}

export async function addGroupAppointmentsOrganizer(subcourseId: number, organizer: Student) {
    const organizerId = userForStudent(organizer).userID;

    for (const lecture of await prisma.lecture.findMany({ where: { subcourseId } })) {
        if (lecture.participantIds.includes(organizerId)) {
            throw new Error(
                `User(${organizerId}) is already a participant of Appointment(${lecture.id}) of Subcourse(${subcourseId}), cannot add as organizer`
            );
        }

        if (lecture.organizerIds.includes(organizerId)) {
            logger.info(`User(${organizerId}) is already an organizer of Appointment(${lecture.id}) of Subcourse(${subcourseId})`);
            continue;
        }

        await prisma.lecture.update({ where: { id: lecture.id }, data: { organizerIds: { push: organizerId } } });
        logger.info(`User(${organizerId}) added as organizer of Appointment(${lecture.id}) of Subcourse(${subcourseId})`);
        if (lecture.zoomMeetingId) {
            const zoomUser = await getOrCreateZoomUser(organizer);
            await addOrganizerToZoomMeeting(lecture, zoomUser);
        }
    }
}

export async function removeGroupAppointmentsOrganizer(subcourseId: number, organizerId: string, organizerEmail?: string) {
    const appointments = await prisma.lecture.findMany({ where: { subcourseId } });
    await Promise.all(
        appointments.map(async (a) => {
            const organizers = a.organizerIds;
            const newOrganizers = organizers.filter((oId) => oId !== organizerId);
            await prisma.lecture.update({
                where: { id: a.id },
                data: { organizerIds: { set: newOrganizers } },
            });
            logger.info(`Removed User(${organizerId}) as organizer of Appointment(${a.id}) of Subcourse(${subcourseId})`);
            if (a.zoomMeetingId) {
                await removeOrganizerFromZoomMeeting(a, organizerEmail);
            }
        })
    );
}
