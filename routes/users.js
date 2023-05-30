import { Router } from "express";
import axios from "axios";
import qs from "qs";
import {
  orgMappings,
  connectionsMappings,
  rolesMappings,
  idToOrgMappings,
  clientIdList,
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

router.get("/listusers", checkJwt, async (req, res) => {
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

  let listOpts = {
    method: "GET",
  };
  console.log("/listusers => Staring route.");
  axios
    .request(options)
    .then(function (response) {
      console.log(`/listusers => Getting access token.`);
      listOpts.headers = {
        Authorization:
          response.data.token_type + " " + response.data.access_token,
      };
      let axiosRequestList = [];

      clientIdList.forEach((client) => {
        listOpts.url = `https://withspoke.us.auth0.com/api/v2/organizations/${client}/invitations`;

        axiosRequestList.push(axios.request(listOpts));
      });
      console.log(`/listusers => Listing users.`);
      return axios.all(axiosRequestList);
    })
    .then((responses) => {
      console.log(`/listusers => Successfully list users.`);

      let users = [];

      responses.forEach((response) => {
        response.data.forEach((user) => {
          delete user.client_id;
          delete user.invitation_url;
          delete user.ticket_id;
          delete user.expires_at;
          user.organization = idToOrgMappings[user.organization_id];
          delete user.organization_id;

          users.push(user);
        });
      });

      res.json({ status: "Successful", data: users });
    })
    .catch(function (error) {
      console.log(`/listusers => Error in route: `, error);
      res.status(500).json({ status: "Error in inviting user" });
    });
  console.log("/listusers => Finished route.");
});

export default router;
