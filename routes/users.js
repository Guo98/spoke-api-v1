import { Router } from "express";
import axios from "axios";
import qs from "qs";
import {
  orgMappings,
  connectionsMappings,
  rolesMappings,
} from "../utils/mappings/auth0.js";
import { checkJwt } from "../services/auth0.js";

const router = Router();

router.post("/inviteusers", checkJwt, async (req, res) => {
  const { client, connection, invite_email, role } = req.body;
  console.log(`/inviteusers/${client} => Starting route.`);
  const options = {
    method: "POST",
    url: "https://withspoke.us.auth0.com/oauth/token",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    data: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AUTH0_API_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: "https://withspoke.us.auth0.com/api/v2/",
    }),
  };

  let inviteOpts = {
    method: "POST",
    url: `https://withspoke.us.auth0.com/api/v2/organizations/${orgMappings[client]}/invitations`,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    data: qs.stringify({
      inviter: {
        name: "Spoke",
      },
      invitee: {
        email: invite_email,
      },
      client_id: process.env.AUTH0_UI_CLIENT_ID,
      connection_id: connectionsMappings[connection],
      send_invitation_email: true,
      roles: role ? [rolesMappings[role]] : [],
    }),
  };

  axios
    .request(options)
    .then(function (response) {
      console.log(`/inviteusers/${client} => Getting access token.`);
      inviteOpts.headers["Authorization"] =
        response.data.token_type + " " + response.data.access_token;
      console.log(`/inviteusers/${client} => Inviting user.`);
      return axios.request(inviteOpts);
    })
    .then((inviteResp) => {
      console.log(
        `/inviteusers/${client} => Successfully sent invite to user:`,
        inviteResp.data
      );
    })
    .catch(function (error) {
      console.log(`/inviteusers/${client} => Error in route: `, error);
      res.status(500).json({ status: "Error in inviting user" });
    });

  if (!res.headersSent) res.send({ status: "Successful" });
  console.log(`/inviteusers/${client} => Ending route.`);
});

export default router;
