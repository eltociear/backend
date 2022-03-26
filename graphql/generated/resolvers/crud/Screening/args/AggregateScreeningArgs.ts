import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { ScreeningOrderByWithRelationInput } from "../../../inputs/ScreeningOrderByWithRelationInput";
import { ScreeningWhereInput } from "../../../inputs/ScreeningWhereInput";
import { ScreeningWhereUniqueInput } from "../../../inputs/ScreeningWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class AggregateScreeningArgs {
  @TypeGraphQL.Field(_type => ScreeningWhereInput, {
    nullable: true
  })
  where?: ScreeningWhereInput | undefined;

  @TypeGraphQL.Field(_type => [ScreeningOrderByWithRelationInput], {
    nullable: true
  })
  orderBy?: ScreeningOrderByWithRelationInput[] | undefined;

  @TypeGraphQL.Field(_type => ScreeningWhereUniqueInput, {
    nullable: true
  })
  cursor?: ScreeningWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
