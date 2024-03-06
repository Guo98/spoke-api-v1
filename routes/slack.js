import { Router } from "express";
import crypto from "crypto";
import { CosmosClient } from "@azure/cosmos";

import { config } from "../utils/config.js";
import { Spoke } from "../models/spoke.js";

import { checkJwt } from "../services/auth0.js";
import {
  slackMarketplaceRequestForm,
  slackReturnForm,
} from "../services/slack/slack_forms.js";
import { handleSlackAction } from "../services/slack/slack_actions.js";
import {
  getOrderInfo,
  getOutstandingReturns,
} from "../services/slack/slack_reads.js";
import { slack_team_ids } from "../services/slack/slack_mappings.js";

import pkg from "@slack/bolt";
const { App } = pkg;
const router = Router();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const slack = (req, res, next) => {
  if (
    !req.headers["x-slack-request-timestamp"] ||
    Math.abs(
      Math.floor(new Date().getTime() / 1000) -
        +req.headers["x-slack-request-timestamp"]
    ) > 300
  ) {
    console.log("slack middleware request too old");
    return res.status(400).send("Request too old!");
  }

  const baseStr = `v0:${req.headers["x-slack-request-timestamp"]}:${req.rawBody}`;

  const receivedSignature = req.headers["x-slack-signature"];

  const expectedSignature = `v0=${crypto
    .createHmac("sha256", process.env.SLACK_SIGNING_SECRET)
    .update(baseStr, "utf8")
    .digest("hex")}`;

  if (expectedSignature !== receivedSignature) {
    console.log("slack() => Error: signature mismatch.");
    return res.status(400).send("Signature mismatched.");
  }

  next();
};

const cosmosClient = new CosmosClient({
  endpoint: config.endpoint,
  key: config.key,
});

const spoke = new Spoke(cosmosClient, "Spoke");

spoke
  .init((err) => {
    console.log("cosmos spoke db init err: ", err);
  })
  .catch((err) => {
    console.error("shutting down spoke db because of error: ", err);
    process.exit(1);
  });

// C05NMSAF4F3

async function checkClientAndUsers(team_id, user_id) {
  const slack_clients = await spoke.getSlackTeams();

  const slack_index = slack_clients.findIndex((sc) => sc.id === team_id);

  if (slack_index > -1) {
    if (
      slack_clients[slack_index].allowed_users.findIndex(
        (user) => user === user_id
      ) < 0
    ) {
      return "User not allowed";
    } else {
      return slack_clients[slack_index].client;
    }
  } else {
    return "";
  }
}

router.post("/message", checkJwt, async (req, res) => {
  console.log("/message => Starting route.");
  const {
    rating,
    requested_item,
    recommended_item,
    recommended_link,
    add_to_marketplace,
    requestor_email,
  } = req.body;
  try {
    let blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: rating ? "*Good Recommendation*" : "*Bad Recommendation*",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Requested Item:*\n" + requested_item,
          },
          {
            type: "mrkdwn",
            text: "*Recommended Item:*\n" + recommended_item,
          },
          {
            type: "mrkdwn",
            text: "*Recommended Link:*\n" + recommended_link,
          },
          {
            type: "mrkdwn",
            text: "*Submitted By:*\n" + requestor_email,
          },
        ],
      },
    ];

    if (add_to_marketplace) {
      blocks.splice(1, 0, {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Add to Marketplace*",
        },
      });
    }
    const result = await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: "C05NMSAF4F3",
      text: "New Rating",
      blocks: blocks,
    });
    console.log("/message => Successfully sent message.");
    res.json({ status: "Successful" });
  } catch (e) {
    console.log("/message => Error in sending message: ", e);
    res.status(500).json({ status: "Error" });
  }
  console.log("/message => Finished route.");
});

router.post("/slack/order", slack, async (req, res) => {
  console.log("/slackorder => Starting route.");
  const client = await checkClientAndUsers(req.body.team_id, req.body.user_id);

  if (client !== "" && client !== "User not allowed") {
    try {
      const response = await slackMarketplaceRequestForm(
        req.body.channel_id,
        client
      );

      res.json(response);
    } catch (e) {
      res.json({
        response_type: "in_channel",
        channel: req.body.channel_id,
        text: "Service unavailable right now. Please reach out to Spoke team for assistance.",
      });
    }
  } else if (client === "User not allowed") {
    res.json({
      response_type: "in_channel",
      channel: req.body.channel_id,
      text: "Action currently not allowed by user. Please reach out to Spoke.",
    });
  } else {
    res.json({
      response_type: "in_channel",
      channel: req.body.channel_id,
      text: "Functionality currently not supported. Please reach out to Spoke team for assistance.",
    });
  }
});

router.post("/slack/return", slack, async (req, res) => {
  console.log("/slack/return => Starting route.", req.body);
  const client = await checkClientAndUsers(req.body.team_id, req.body.user_id);

  if (client !== "" && client !== "User not allowed") {
    try {
      const response = await slackReturnForm(
        req.body.channel_id,
        req.body.team_id
      );

      res.json(response);
    } catch (e) {
      res.json({
        response_type: "in_channel",
        channel: req.body.channel_id,
        text: "Service unavailable right now. Please reach out to Spoke team for assistance.",
      });
    }
  } else if (client === "User not allowed") {
    res.json({
      response_type: "in_channel",
      channel: req.body.channel_id,
      text: "Action currently not allowed by user. Please reach out to Spoke.",
    });
  } else {
    res.json({
      response_type: "in_channel",
      channel: req.body.channel_id,
      text: "Functionality currently not supported. Please reach out to Spoke team for assistance.",
    });
  }
});

router.post("/slack/actions", slack, async (req, res) => {
  console.log("/slack/actions => req.body", req.body);

  const payload = JSON.parse(req.body.payload);
  const resp_url = payload.response_url;

  if (payload.actions[0].type === "static_select") {
    res.send("Ok");
    console.log("/slack/actions => Sent acknowledgment response");
  } else {
    console.log("/slack/actions => Starting handleSlackAction()");
    await handleSlackAction(payload, resp_url);
    console.log("/slack/actions => Finished handleSlackAction()");
  }
});

router.post("/slack/options", slack, async (req, res) => {
  console.log("/slackoptions => req.body", req.body);
  console.log("/slackoptions => payload", req.body.payload);
  res.json({
    options: [
      {
        text: {
          type: "plain_text",
          text: "*this is plain_text text*",
        },
        value: "value-0",
      },
      {
        text: {
          type: "plain_text",
          text: "*this is plain_text text*",
        },
        value: "value-1",
      },
      {
        text: {
          type: "plain_text",
          text: "*this is plain_text text*",
        },
        value: "value-2",
      },
    ],
  });
});

router.post("/slack/order_info", slack, async (req, res) => {
  console.log("/slack/order_info => Starting route.");

  const order_number = req.body.text;

  const client = await checkClientAndUsers(req.body.team_id, req.body.user_id);

  if (client !== "" && client !== "User not allowed") {
    const response = await getOrderInfo(
      client,
      order_number,
      req.body.channel_id
    );

    res.json(response);
  } else if (client === "User not allowed") {
    res.json({
      response_type: "in_channel",
      channel: req.body.channel_id,
      text: "Action currently not allowed by user. Please reach out to Spoke.",
    });
  } else {
    res.json({
      response_type: "in_channel",
      channel: req.body.channel_id,
      text: "Currently not supported. Please reach out to Spoke.",
    });
  }

  console.log("/slack/order_info => Finished route.");
});

router.post("/slack/outstanding_returns", slack, async (req, res) => {
  console.log("/slack/outstanding_returns => Starting route.");
  const client = await checkClientAndUsers(req.body.team_id, req.body.user_id);

  if (client !== "" && client !== "User not allowed") {
    const response = await getOutstandingReturns(client, req.body.channel_id);
    res.json(response);
  } else if (client === "User not allowed") {
    res.json({
      response_type: "in_channel",
      channel: req.body.channel_id,
      text: "Action currently not allowed by user. Please reach out to Spoke.",
    });
  } else {
    res.json({
      response_type: "in_channel",
      channel: req.body.channel_id,
      text: "Currently not supported. Please reach out to Spoke.",
    });
  }
  console.log("/slack/outstanding_returns => Finished route.");
});

router.post("/slack/authorize", checkJwt, async (req, res) => {
  const { code, client, user_email } = req.body;
  console.log(`/slack/authorize/${client} => Starting route.`);

  try {
    const slack_teams = await spoke.getSlackTeams();

    const team_index = slack_teams.findIndex((team) => team.client === client);

    if (team_index > -1) {
      try {
        console.log(
          `/slack/authorize/${client} => Checking user: ${user_email}`
        );
        const user_resp = await app.client.users.lookupByEmail({
          token: slack_teams[team_index].access_token,
          email: user_email,
        });

        if (
          slack_teams[team_index].allowed_users.findIndex(
            (user_id) => user_id === user_resp.user.id
          ) < 0
        ) {
          console.log(
            `/slack/authorize/${client} => Adding user: ${user_email}`
          );
          const add_user = await spoke.addNewUser(
            slack_teams[team_index].id,
            user_resp.user.id
          );
          res.json({ status: "Added user" });
        } else {
          console.log(`/slack/authorize/${client} => User already whitelisted`);
          res.json({ status: "Already exists" });
        }
      } catch (e) {
        console.log("/slack/authorize => Error in adding user:", e);
        res.status(500).json({ status: "Error" });
      }
    } else {
      console.log(
        `/slack/authorize/${client} => Connecting to new client workspace`
      );
      try {
        const oauth_resp = await app.client.oauth.v2.access({
          code,
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
        });
        console.log(
          `/slack/authorize/${client} => Successfully connected to new workspace.`
        );
        const team_id = oauth_resp.team.id;
        const team_name = oauth_resp.team.name;
        const bot_access_token = oauth_resp.access_token;
        const user_id = oauth_resp.authed_user.id;
        const add_team = await spoke.newSlackTeam(
          team_name,
          team_id,
          bot_access_token,
          client,
          user_id
        );
        console.log("/slack/authorize => Successfully authorized.");
        res.json({ status: "Successful" });
      } catch (e) {
        console.log("/slack/authorize => Error:", e);
        res.status(500).json({ status: "Error" });
      }
    }
  } catch (e) {}

  if (!res.headersSent) res.send("Yay");
});

export default router;

export { slack };
