/* eslint-disable import/no-cycle */
import {
    Column,
    CreateDateColumn,
    Entity,
    EntityManager,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { Student } from './Student';
import { Pupil } from './Pupil';
import { Subject } from '../util/subjectsutils';
import { v4 as generateUUID } from 'uuid';
import { Lecture as Appointment } from './Lecture';

export enum SourceType {
    IMPORTED = 'imported',
    MATCHEDEXTERNAL = 'matchedexternal', //by mathematical algo
    MATCHEDINTERNAL = 'matchedinternal',
}

@Entity()
@Unique('UQ_MATCH', ['student', 'pupil'])
export class Match {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column()
    uuid: string;

    @Column({
        default: false,
    })
    dissolved: boolean;

    @Column({
        default: null,
        nullable: true,
        type: 'timestamp',
    })
    dissolvedAt?: Date;

    @Column({
        default: null,
        nullable: true,
    })
    dissolveReason: number;

    @Column({
        nullable: true,
    })
    proposedTime: Date;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @ManyToOne((type) => Student, (student) => student.matches, {
        eager: true,
    })
    @JoinColumn()
    student: Student;

    @ManyToOne((type) => Pupil, (pupil) => pupil.matches, {
        eager: true,
    })
    @JoinColumn()
    pupil: Pupil;

    @OneToMany(() => Appointment, (appointment) => appointment.match, { nullable: true })
    appointments: Appointment[];

    //all emails that were sent associated with this match (i.e. emails about confirming the match, dissolving it, etc. )
    @Column({
        default: false,
    })
    feedbackToPupilMail: boolean;

    @Column({
        default: false,
    })
    feedbackToStudentMail: boolean;

    @Column({
        default: false,
    })
    followUpToPupilMail: boolean;

    @Column({
        default: false,
    })
    followUpToStudentMail: boolean;

    @Column({
        type: 'enum',
        enum: SourceType,
        default: SourceType.MATCHEDINTERNAL,
    })
    source: SourceType; //stores if the match was imported from the old Database and not matched in the system itself

    // Students and Pupils request a match by increasing their "openMatchRequest" counter
    // A match decreases that counter. Thus we cannot really say 'which request lead to which match'
    // However we know when the user first increased the counter from 0 to 1, thus making their viable for matching
    // Thus for users having only one open match request (the majority), this prediction is accurate
    // For users with more than one open match request, this overestimates the request time
    @Column({ nullable: true })
    studentFirstMatchRequest: Date;

    @Column({ nullable: true })
    pupilFirstMatchRequest: Date;

    @Column({ nullable: true })
    matchPool?: string;

    constructor(pupil: Pupil, student: Student, uuid: string = generateUUID()) {
        this.pupil = pupil;
        this.student = student;
        this.uuid = uuid;
    }
}
