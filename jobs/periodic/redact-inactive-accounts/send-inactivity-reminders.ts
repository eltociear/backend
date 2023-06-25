import { getLogger } from '../../../common/logger/logger';
import moment from 'moment';
import { prisma } from '../../../common/prisma';
import * as Notification from '../../../common/notification';
import { Person } from '../../../common/notification/types';

// approx. 2 1/2 years in days
export const GRACE_PERIOD_INACTIVE_SEND_MAIL = 2.5 * 365;

const logger = getLogger('SendInactivityReminder');

async function getInactivePersons(minActivityInDays: number): Promise<Person[]> {
    const whereCondition = {
        active: true,
        isRedacted: false,
        updatedAt: {
            lt: moment().startOf('day').subtract(minActivityInDays, 'days').toDate(),
        },
    };

    const pupilsToBeNotified = await prisma.pupil.findMany({ where: whereCondition });
    const studentsToBeNotified = await prisma.student.findMany({ where: whereCondition });
    const mentorsToBeNotified = await prisma.mentor.findMany({ where: whereCondition });
    const screenersToBeNotified = await prisma.screener.findMany({ where: whereCondition });

    return [].concat(pupilsToBeNotified, studentsToBeNotified, mentorsToBeNotified, screenersToBeNotified);
}

export async function sendInactivityReminders() {
    const inactivePersons = await getInactivePersons(GRACE_PERIOD_INACTIVE_SEND_MAIL);
    logger.info('Send account deletion reminders to inactive persons', { personCount: inactivePersons.length });
    for (const person of inactivePersons) {
        await Notification.actionTaken(person, 'inactive_person_account_deletion_reminder', {});
    }
}
