import { ApolloError } from "apollo-server-errors";
import { getLogger } from "log4js";
import { ClientError } from "../common/util/error";

export { AuthenticationError, ForbiddenError, UserInputError, ValidationError } from "apollo-server-errors";

const log = getLogger("GraphQL Error");

export function formatError(error: ApolloError) {
    /* We expect ClientErrors here, these are intended to be shared with users */
    if (error.originalError instanceof ClientError) {
        return error;
    }

    /* All other kinds of errors are not expected here. Better not share them with clients, they might contain secrets! */
    log.error(error.originalError);
    throw new Error(`Internal Server Error - Consult logs for details`);
}