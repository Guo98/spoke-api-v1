import { Router } from "express";

const router = Router();

router.post("/slackdemoroute", async (req, res) => {
  try {
    const response = {
      response_type: "in_channel",
      channel: req.body.channel_id,
      text: "Hello, World!",

      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "New request",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: "*Type:*\nPaid Time Off",
            },
            {
              type: "mrkdwn",
              text: "*Created by:*\n<example.com|Fred Enriquez>",
            },
          ],
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: "*When:*\nAug 10 - Aug 13",
            },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                emoji: true,
                text: "Approve",
              },
              style: "primary",
              value: "click_me_123",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                emoji: true,
                text: "Reject",
              },
              style: "danger",
              value: "click_me_123",
            },
          ],
        },
      ],
    };

    return res.json(response);
  } catch (e) {
    return res.status(500).send("Ooops");
  }
});