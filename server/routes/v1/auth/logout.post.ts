import { defineEventHandler, setResponseStatus } from "h3";
import { apiSuccess } from "../../../lib/api-response.js";

export default defineEventHandler(async (event) => {
  setResponseStatus(event, 200);
  return apiSuccess({
    signedOut: true,
    redirectTo: "/login",
  });
});