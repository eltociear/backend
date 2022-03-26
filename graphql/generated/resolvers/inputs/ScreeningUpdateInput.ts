import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { BoolFieldUpdateOperationsInput } from "../inputs/BoolFieldUpdateOperationsInput";
import { DateTimeFieldUpdateOperationsInput } from "../inputs/DateTimeFieldUpdateOperationsInput";
import { NullableStringFieldUpdateOperationsInput } from "../inputs/NullableStringFieldUpdateOperationsInput";
import { ScreenerUpdateOneWithoutScreeningsInput } from "../inputs/ScreenerUpdateOneWithoutScreeningsInput";
import { StudentUpdateOneWithoutScreeningInput } from "../inputs/StudentUpdateOneWithoutScreeningInput";

@TypeGraphQL.InputType("ScreeningUpdateInput", {
  isAbstract: true
})
export class ScreeningUpdateInput {
  @TypeGraphQL.Field(_type => BoolFieldUpdateOperationsInput, {
    nullable: true
  })
  success?: BoolFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => NullableStringFieldUpdateOperationsInput, {
    nullable: true
  })
  comment?: NullableStringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => NullableStringFieldUpdateOperationsInput, {
    nullable: true
  })
  knowsCoronaSchoolFrom?: NullableStringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => DateTimeFieldUpdateOperationsInput, {
    nullable: true
  })
  createdAt?: DateTimeFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => DateTimeFieldUpdateOperationsInput, {
    nullable: true
  })
  updatedAt?: DateTimeFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => ScreenerUpdateOneWithoutScreeningsInput, {
    nullable: true
  })
  screener?: ScreenerUpdateOneWithoutScreeningsInput | undefined;

  @TypeGraphQL.Field(_type => StudentUpdateOneWithoutScreeningInput, {
    nullable: true
  })
  student?: StudentUpdateOneWithoutScreeningInput | undefined;
}
