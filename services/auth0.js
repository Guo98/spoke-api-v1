import { auth, requiredScopes } from "express-oauth2-jwt-bearer";
import axios from "axios";

const checkJwt = auth({
  audience: process.env.AUDIENCE,
  issuerBaseURL: process.env.AUTH_ISSUER_URL,
});

const checkScopes = requiredScopes("read:messages");

export { checkJwt, checkScopes };
