import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Concrete_notificationOrderByWithRelationInput } from "../../../inputs/Concrete_notificationOrderByWithRelationInput";
import { Concrete_notificationWhereInput } from "../../../inputs/Concrete_notificationWhereInput";
import { Concrete_notificationWhereUniqueInput } from "../../../inputs/Concrete_notificationWhereUniqueInput";
import { Concrete_notificationScalarFieldEnum } from "../../../../enums/Concrete_notificationScalarFieldEnum";

@TypeGraphQL.ArgsType()
export class FindManyConcrete_notificationArgs {
  @TypeGraphQL.Field(_type => Concrete_notificationWhereInput, {
    nullable: true
  })
  where?: Concrete_notificationWhereInput | undefined;

  @TypeGraphQL.Field(_type => [Concrete_notificationOrderByWithRelationInput], {
    nullable: true
  })
  orderBy?: Concrete_notificationOrderByWithRelationInput[] | undefined;

  @TypeGraphQL.Field(_type => Concrete_notificationWhereUniqueInput, {
    nullable: true
  })
  cursor?: Concrete_notificationWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;

  @TypeGraphQL.Field(_type => [Concrete_notificationScalarFieldEnum], {
    nullable: true
  })
  distinct?: Array<"id" | "userId" | "notificationID" | "contextID" | "context" | "sentAt" | "state" | "error"> | undefined;
}
