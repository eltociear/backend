/* Long term we want to move away from the disjunct Pupil / Student relationship,
    towards a common User Entity. This module contains some steps towards that entity */

import { pupil as Pupil, student as Student, screener as Screener } from '@prisma/client';
import { prisma } from '../prisma';
import { Prisma as PrismaTypes } from '@prisma/client';
import { validateEmail } from '../../graphql/validators';
import { updateZoomUser } from '../zoom/user';
import { isZoomFeatureActive } from '../zoom/util';

type Person = { id: number; isPupil?: boolean; isStudent?: boolean };

type UserTypes = 'student' | 'pupil' | 'screener';

/* As Prisma values do not inherit an entity class but are plain objects,
   we need a wrapper around the different entities */
export type User = {
    userID: string;
    email: string;
    firstname: string;
    lastname: string;
    active: boolean;
    lastLogin: Date;

    pupilId?: number;
    studentId?: number;
    screenerId?: number;
};

export const userSelection = { id: true, firstname: true, lastname: true, email: true, active: true, lastLogin: true };

export function getUserTypeAndIdForUserId(userId: string): [type: UserTypes, id: number] {
    const validTypes = ['student', 'pupil', 'screener', 'admin'];
    const [type, id] = userId.split('/');
    if (!validTypes.includes(type)) {
        throw Error('No valid user type found in user id: ' + type);
    }
    const parsedId = parseInt(id, 10);
    return [type as UserTypes, parsedId];
}

export async function getUser(userID: string, active?: boolean): Promise<User> {
    const [type, id] = getUserTypeAndIdForUserId(userID);

    if (type === 'student') {
        const student = await prisma.student.findFirst({ where: { id, active }, rejectOnNotFound: true, select: userSelection });
        if (student) {
            return userForStudent(student as Student);
        }
    }

    if (type === 'pupil') {
        const pupil = await prisma.pupil.findFirst({ where: { id, active }, rejectOnNotFound: true, select: userSelection });
        if (pupil) {
            return userForPupil(pupil as Pupil);
        }
    }

    if (type === 'screener') {
        const screener = await prisma.screener.findFirst({ where: { id, active }, rejectOnNotFound: true, select: userSelection });
        if (screener) {
            return userForScreener(screener as Screener);
        }
    }

    throw new Error(`Unknown User(${userID})`);
}

export async function getUserByEmail(email: string, active?: boolean): Promise<User> {
    const student = await prisma.student.findFirst({ where: { email, active }, select: userSelection });
    if (student) {
        return userForStudent(student as Student);
    }

    const pupil = await prisma.pupil.findFirst({ where: { email, active }, select: userSelection });
    if (pupil) {
        return userForPupil(pupil as Pupil);
    }

    const screener = await prisma.screener.findFirst({ where: { email, active }, select: userSelection });
    if (screener) {
        return userForScreener(screener as Screener);
    }

    throw new Error(`Unknown User(email: ${email})`);
}

export function userForPupil(pupil: Pupil) {
    return userForType(pupil, 'pupil');
}

export function userForStudent(student: Student) {
    return userForType(student, 'student');
}

export function userForScreener(screener: Screener) {
    return userForType(screener, 'screener');
}

function userForType(user: Pupil, type: 'pupil'): User;
function userForType(user: Student, type: 'student'): User;
function userForType(user: Screener, type: 'screener'): User;
function userForType(user: Pupil | Student | Screener, type: 'student' | 'pupil' | 'screener'): User {
    return {
        userID: `${type}/${user.id}`,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        active: user.active,
        lastLogin: user.lastLogin,
        [`${type}Id`]: user.id,
    };
}

export function getFullName({ firstname, lastname }: { firstname?: string; lastname?: string }): string {
    if (!firstname) {
        return lastname;
    }

    if (!lastname) {
        return firstname;
    }

    return `${firstname} ${lastname}`;
}

export async function getStudent(user: User): Promise<Student | never> {
    if (!user.studentId) {
        throw new Error(`Expected User(${user.userID}) to be student`);
    }

    return await prisma.student.findUnique({ where: { id: user.studentId } });
}

export async function getPupil(user: User): Promise<Pupil | never> {
    if (!user.pupilId) {
        throw new Error(`Expected User(${user.userID}) to be pupil`);
    }

    return await prisma.pupil.findUnique({ where: { id: user.pupilId } });
}

type UserSelect = PrismaTypes.studentSelect & PrismaTypes.pupilSelect & PrismaTypes.screenerSelect;

export async function queryUser<Select extends UserSelect>(user: User, select: Select) {
    if (user.studentId) {
        return await prisma.student.findUnique({
            where: { id: user.studentId },
            select,
        });
    }

    if (user.pupilId) {
        return await prisma.pupil.findUnique({
            where: { id: user.pupilId },
            select,
        });
    }

    if (user.screenerId) {
        return await prisma.screener.findUnique({
            where: { id: user.screenerId },
            select,
        });
    }

    throw new Error(`Unknown User(${user.userID})`);
}

export async function updateUser(userId: string, { email }: Partial<Pick<User, 'email'>>) {
    const validatedEmail = validateEmail(email);
    const user = await getUser(userId, /* active */ true);
    if (user.studentId) {
        if (isZoomFeatureActive()) {
            await updateZoomUser(user);
        }

        return userForStudent(
            (await prisma.student.update({
                where: { id: user.studentId },
                data: { email: validatedEmail },
                select: userSelection,
            })) as Student
        );
    }
    if (user.pupilId) {
        return userForPupil(
            (await prisma.pupil.update({
                where: { id: user.pupilId },
                data: { email: validatedEmail },
                select: userSelection,
            })) as Pupil
        );
    }
}

export async function getUsers(userIds: User['userID'][]): Promise<User[]> {
    const pupilIds = [];
    const studentIds = [];
    userIds.forEach((userId) => {
        const [type, id] = getUserTypeAndIdForUserId(userId);
        if (type === 'pupil') {
            pupilIds.push(id);
        }
        if (type === 'student') {
            studentIds.push(id);
        }
    });
    const students = (
        await prisma.student.findMany({
            where: {
                id: {
                    in: studentIds,
                },
            },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                active: true,
                lastLogin: true,
            },
        })
    ).map((p) => ({ ...p, isStudent: true, userID: `student/${p.id}` }));

    const pupils = (
        await prisma.pupil.findMany({
            where: {
                id: {
                    in: pupilIds,
                },
            },

            select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                active: true,
                lastLogin: true,
            },
        })
    ).map((p) => ({ ...p, isPupil: true, userID: `pupil/${p.id}` }));
    return [...students, ...pupils];
}

export async function updateLastLogin(user: User) {
    if (user.pupilId) {
        await prisma.pupil.update({ where: { id: user.pupilId }, data: { lastLogin: new Date() } });
    }
    if (user.studentId) {
        await prisma.student.update({ where: { id: user.studentId }, data: { lastLogin: new Date() } });
    }
    if (user.screenerId) {
        await prisma.screener.update({ where: { id: user.screenerId }, data: { lastLogin: new Date() } });
    }
}

export async function getStudentsFromList(userIDs: string[]) {
    const ids = userIDs.filter((it) => it.startsWith('student/')).map((it) => parseInt(it.split('/')[1], 10));
    return await prisma.student.findMany({
        where: { id: { in: ids } },
    });
}

export async function getPupilsFromList(userIDs: string[]) {
    const ids = userIDs.filter((it) => it.startsWith('pupil/')).map((it) => parseInt(it.split('/')[1], 10));
    return await prisma.pupil.findMany({
        where: { id: { in: ids } },
    });
}

export async function refetchStudent(student: Student) {
    return await prisma.student.findUnique({ where: { id: student.id } });
}

export async function refetchPupil(pupil: Pupil) {
    return await prisma.pupil.findUnique({ where: { id: pupil.id } });
}
