import { Router } from "express";

import {
  orgMappings,
  connectionsMappings,
  rolesMappings,
  idToOrgMappings,
  clientIdList,
} from "../utils/mappings/auth0.js";
import { spoke } from "./slack.js";
import { checkJwt, management } from "../services/auth0.js";

const router = Router();

// var management = new ManagementClient({
//   domain: "withspoke.us.auth0.com",
//   clientId: process.env.AUTH0_API_CLIENT_ID,
//   clientSecret: process.env.AUTH0_CLIENT_SECRET,
//   scope: "update:users delete:role_members create:role_members read:roles",
// });

router.post("/invites", checkJwt, async (req, res) => {
  const { client, connection, invite_email, role, hasIds } = req.body;
  console.log(`[POST] /invites/${client} => Starting route.`);

  management.organizations.createInvitation(
    { id: orgMappings[client] },
    {
      inviter: {
        name: "Spoke",
      },
      invitee: {
        email: invite_email.trim(),
      },
      client_id: process.env.AUTH0_UI_CLIENT_ID,
      connection_id: hasIds ? connection : connectionsMappings[connection],
      send_invitation_email: true,
      roles: hasIds
        ? role
          ? role
          : undefined
        : role
        ? [rolesMappings[role]]
        : undefined,
    },
    function (err) {
      if (err) {
        console.log(
          `[POST] /invites/${client} => Error in inviting ${invite_email}: `,
          err
        );
        res.status(500).json({ status: "Error in inviting user" });
      }
      console.log(
        `[POST] /invites/${client} => Successfully invited user: ${invite_email}.`
      );
      res.json({ status: "Successful" });
    }
  );

  try {
    await spoke.addNewUserPortal(client, invite_email);
    console.log(
      `[POST] /invites/${client} => Successfully added new user to portal db.`
    );
  } catch (e) {
    console.log(`[POST] /invites/${client} => Error in adding to db:`, e);
  }
  // if (!res.headersSent) res.json({ status: "Nothing happened" });
  console.log(`[POST] /invites/${client} => Ending route.`);
});

router.get("/invites", checkJwt, async (req, res) => {
  console.log("[GET] /invites => Starting function.");
  let allInvites = [];

  for await (const client of clientIdList) {
    try {
      const invites = await management.organizations.getInvitations({
        id: client,
      });
      invites.forEach((user) => {
        delete user.client_id;
        delete user.invitation_url;
        delete user.ticket_id;
        delete user.expires_at;
        user.organization = idToOrgMappings[user.organization_id];
        delete user.organization_id;

        allInvites.push(user);
      });
    } catch (err) {
      console.log(
        `[GET] /invites => Error in getting invites for client: ${client}`,
        err
      );
      res.status(500).json({ status: "Error" });
      return;
    }
  }

  if (!res.headersSent) res.json({ status: "Successful", data: allInvites });
  console.log("[GET] /invites => Finished function.");
});

router.delete("/invites/:client/:inviteId", checkJwt, async (req, res) => {
  const { client, inviteId } = req.params;
  console.log(`[DELETE] /invites/${client} => Starting route.`);

  management.organizations.deleteInvitation(
    { id: orgMappings[client], invitation_id: inviteId },
    function (err) {
      if (err) {
        console.log(
          `[DELETE] /invites/${client} => Error in deleting invite: ${inviteId}:`,
          err
        );
        res.status(500).json({ status: "Error in deleting invite" });
      }

      console.log(
        `[DELETE] /invites/${client} => Successfully deleted invite: ${inviteId}`
      );
      res.json({ status: "Successful" });
    }
  );
  // if (!res.headersSent) res.json({ status: "Nothing happened" });
  console.log(`[DELETE] /invites/${client} => Finished route.`);
});

router.get("/users", checkJwt, async (req, res) => {
  console.log(`[GET] /users => Starting route.`);
  let allUsers = [];

  for await (const client of clientIdList) {
    try {
      const users = await management.organizations.getMembers({ id: client });

      users.forEach((user) => {
        delete user.picture;
        allUsers.push({ ...user, client: idToOrgMappings[client] });
      });
    } catch (err) {
      console.log(
        `[GET] /users => Error in getting users for client: ${client}`,
        err
      );
      res.status(500).json({ status: "Error" });
      return;
    }
  }

  management.getUsers(function (err, users) {
    if (err) {
      console.log("[GET] /users => Error in getting all users:", err);
      res.status(500).json({ status: "Error" });
    }

    console.log("[GET] /users => Successfully got all users.");
    users.forEach((user) => {
      delete user.picture;
      delete user.last_ip;
      delete user.updated_at;
      delete user.identities;
      delete user.email_verified;
      delete user.logins_count;
    });

    const newUsersList = users.map((user) => ({
      ...user,
      ...allUsers.find((orgUser) => orgUser.user_id === user.user_id),
    }));

    res.json({ status: "Successful", data: newUsersList });
  });

  // if (!res.headersSent) res.json({ status: "Successful", data: allUsers });
  console.log("[GET] /users => Finished route.");
});

router.delete("/users/:id", checkJwt, async (req, res) => {
  console.log("[DELETE] /users => Starting route.");
  const { id } = req.params;

  management.deleteUser({ id }, function (err) {
    if (err) {
      console.log(
        `[DELETE] /users => Error in deleting user: ${id}. Error:`,
        err
      );
      res.status(500).json({ status: "Error" });
    }
    console.log("[DELETE] /users => Successfully deleted user.");
    res.json({ status: "Successful" });
  });
  // if (!res.headersSent) res.json({ status: "Nothing happened" });
  console.log("[DELETE] /users => Finished route.");
});

router.patch("/users", checkJwt, async (req, res) => {
  const { id, new_role, delete_role } = req.body;
  console.log("[PATCH] /users => Starting route.");

  management.removeRolesFromUser(
    { id },
    { roles: [delete_role] },
    function (err) {
      if (err) {
        console.log(
          `[PATCH] /users => Error in removing role from user: ${id}. Error:`,
          err
        );
        res.status(500).json({ status: "Error" });
      }
      console.log(
        "[PATCH] /users => Succcessfully removed role from user:",
        id
      );
      management.assignRolestoUser(
        { id },
        { roles: [new_role] },
        function (err) {
          if (err) {
            console.log(
              `[PATCH] /users => Error in assigning role to user: ${id}. Error:`,
              err
            );
            res.status(500).json({ status: "Error" });
          }
          console.log(
            "[PATCH] /users => Succcessfully assigned role to user:",
            id
          );
          res.json({ status: "Successful" });
        }
      );
    }
  );
  // if (!res.headersSent) res.json({ status: "Nothing happened" });
  console.log("[PATCH] /users => Finished route.");
});
export default router;
