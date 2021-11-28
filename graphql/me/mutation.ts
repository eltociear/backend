import { Role } from "../authorizations";
import { AuthorizedDeferred } from "../authorizations";
import { Arg, Authorized, Ctx, Field, InputType, Int, Mutation, Resolver } from "type-graphql";
import { Me } from "./fields";
import { Subject } from "../types/subject";
import { GraphQLContext } from "../context";
import { getSessionUser } from "../authentication";
import { prisma } from "../../common/prisma";

@InputType()
class PupilUpdateInput {
    @Field(type => Int, { nullable: true })
    grade?: number;

    @Field(type => [Subject], { nullable: true })
    subjects?: Subject[];
}

@InputType()
class StudentUpdateInput {
    @Field(type => [Subject], { nullable: true })
    subjects?: Subject[];
}


@InputType()
class MeUpdateInput {
  @Field(type => String, { nullable: true })
  firstname?: string;

  @Field(type => String, { nullable: true })
  lastname?: string;

  @Field(type => PupilUpdateInput, { nullable: true })
  pupil?: PupilUpdateInput;

  @Field(type => StudentUpdateInput, { nullable: true })
  student?: StudentUpdateInput;

}

@Resolver(of => Me)
export class MutateMeResolver {
    @Mutation(returns => Boolean)
    @Authorized(Role.USER)
    async meUpdate(@Ctx() context: GraphQLContext, @Arg("update") update: MeUpdateInput) {
        const user = getSessionUser(context);

        const { firstname, lastname, pupil, student } = update;

        if (user.pupilId) {
            if (student) {
                throw new Error(`Tried to update student data on a pupil`);
            }

            const { subjects, grade } = pupil;

            await prisma.pupil.update({
                data: {
                    firstname,
                    lastname,
                    // TODO: Store numbers as numbers maybe ...
                    grade: `${grade}. Klasse`,
                    subjects: JSON.stringify(subjects)
                },
                where: { id: user.pupilId }
            });

            return true;
        }

        if (user.studentId) {
            if (pupil) {
                throw new Error(`Tried to update pupil data on student`);
            }

            const { subjects } = student;

            await prisma.student.update({
                data: {
                    firstname,
                    lastname,
                    subjects: JSON.stringify(subjects)
                },
                where: { id: user.studentId }
            });

            return true;
        }
        throw new Error(`This mutation is currently not supported for this user type`);
    }
}