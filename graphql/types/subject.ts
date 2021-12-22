import { Field, InputType, Int, ObjectType } from "type-graphql";

@ObjectType()
@InputType()
class Range { // GraphQL Type for common/entity/Student -> Subject.range
    @Field(type => Int)
    min: number;
    @Field(type => Int)
    max: number;
}

@ObjectType()
@InputType()
export class Subject { // GraphQL Type for common/entity/Student -> Subject
    @Field()
    name: string;

    @Field(type => Range)
    grade: Range;
}