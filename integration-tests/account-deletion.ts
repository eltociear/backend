import { test } from './base';
import assert from 'assert';
import { createMockNotification } from './notifications';
import { pupilOne, studentOne, createPupil } from './user';
import { prisma } from '../common/prisma';
import moment from 'moment';
import { sendInactivityReminders, GRACE_PERIOD_INACTIVE_SEND_MAIL } from '../jobs/periodic/redact-inactive-accounts/send-inactivity-reminders';

void test('Should send notification if user is inactive for longer', async () => {
    const mockNotification = await createMockNotification('inactive_person_account_deletion_reminder', 'InactivePersonAccountDeletionReminder');
    const pupilRes = await createPupil();

    await prisma.pupil.update({
        where: { id: pupilRes.pupil.pupil.id },
        data: {
            updatedAt: moment()
                .subtract(GRACE_PERIOD_INACTIVE_SEND_MAIL + 1, 'days')
                .toDate(),
        },
    });

    await sendInactivityReminders();

    const concreteNotification = await prisma.concrete_notification.findFirst({
        where: {
            userId: pupilRes.pupil.userID,
            notificationID: mockNotification.id,
        },
    });

    // The concrete notification was created
    assert.notStrictEqual(concreteNotification, null);
});

void test('Should send notification if student is inactive for longer', async () => {
    const mockNotification = await createMockNotification('inactive_person_account_deletion_reminder', 'InactivePersonAccountDeletionReminder');
    const studentRes = await studentOne;

    await prisma.student.update({
        where: { id: studentRes.student.student.id },
        data: {
            updatedAt: moment()
                .subtract(GRACE_PERIOD_INACTIVE_SEND_MAIL + 1, 'days')
                .toDate(),
        },
    });

    await sendInactivityReminders();

    const concreteNotification = await prisma.concrete_notification.findFirst({
        where: {
            userId: studentRes.student.userID,
            notificationID: mockNotification.id,
        },
    });

    // The concrete notification was created
    assert.notStrictEqual(concreteNotification, null);
});

void test('Should not send notification if user is not inactive for long enough', async () => {
    const mockNotification = await createMockNotification('inactive_person_account_deletion_reminder', 'InactivePersonAccountDeletionReminder');
    const pupilRes = await pupilOne;

    await prisma.pupil.update({
        where: { id: pupilRes.pupil.pupil.id },
        data: {
            updatedAt: moment()
                .subtract(GRACE_PERIOD_INACTIVE_SEND_MAIL - 1, 'days')
                .toDate(),
        },
    });

    await sendInactivityReminders();

    const concreteNotification = await prisma.concrete_notification.findFirst({
        where: {
            userId: pupilRes.pupil.userID,
            notificationID: mockNotification.id,
        },
    });

    // The concrete notification was created
    assert.strictEqual(concreteNotification, null);
});
