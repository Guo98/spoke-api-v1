import { auth, requiredScopes } from "express-oauth2-jwt-bearer";
import { ManagementClient } from "auth0";
import axios from "axios";

const checkJwt = auth({
  audience: process.env.AUDIENCE,
  issuerBaseURL: process.env.AUTH_ISSUER_URL,
});

const checkScopes = requiredScopes("read:messages");

var management = new ManagementClient({
  domain: "withspoke.us.auth0.com",
  clientId: process.env.AUTH0_API_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  scope: "update:users delete:role_members create:role_members read:roles",
});

async function createNewClient(
  client,
  google_sso = false,
  microsoft_sso = false
) {
  let enabled_connections = [
    {
      connection_id: "con_Mt30bKtIThVagGZe",
      assign_membership_on_login: false,
      show_as_button: true,
    },
  ];

  if (google_sso) {
    enabled_connections.push({
      connection_id: "con_PUjmnlUiJXfcfYvG",
      assign_membership_on_login: false,
      show_as_button: true,
    });
  }

  if (microsoft_sso) {
    enabled_connections.push({
      connection_id: "con_EkxR1C0F3nkAUcyo",
      assign_membership_on_login: false,
      show_as_button: true,
    });
  }
  try {
    const create_result = await management.organizations.create({
      name: client.toLowerCase(),
      display_name: client,
      branding: {
        logo_url:
          "https://spokeimages.blob.core.windows.net/image/fullspokelogo.png",
      },
      enabled_connections,
    });

    return create_result.id;
  } catch (e) {
    console.log(
      `createNewClient(${client}) => Error in creating new organization for client:`,
      e
    );

    return "";
  }
}

export { checkJwt, checkScopes, management, createNewClient };

/**
 * ,
    function (err, org) {
      if (err) {
        console.log(
          `createNewClient(${client}) => Error in creating new organization for client:`,
          err
        );

        return "";
      }

      console.log(
        `createNewClient(${client}) => Successfully created new organization`,
        org
      );

      return org.id;
    }
 */
