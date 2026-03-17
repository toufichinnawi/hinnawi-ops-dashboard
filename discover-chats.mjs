/**
 * Discover Teams chat IDs for the 🔥 store group chats
 * Uses the same ROPC auth as teamsChat.ts
 */
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const clientId = process.env.MS_GRAPH_CLIENT_ID || "1fec8e78-bce4-4aaf-ab1b-5451cc387264";
const username = process.env.MS_GRAPH_USERNAME;
const password = process.env.MS_GRAPH_PASSWORD;

if (!username || !password) {
  console.error("MS_GRAPH_USERNAME and MS_GRAPH_PASSWORD required");
  process.exit(1);
}

async function getToken() {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "https://graph.microsoft.com/.default",
    username,
    password,
    grant_type: "password",
  });

  const resp = await axios.post(
    "https://login.microsoftonline.com/organizations/oauth2/v2.0/token",
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return resp.data.access_token;
}

async function main() {
  const token = await getToken();
  console.log("Got token, fetching chats...\n");

  // Get all chats the user is part of
  let allChats = [];
  let url = "https://graph.microsoft.com/v1.0/me/chats?$top=50&$expand=members";
  
  while (url) {
    const resp = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    allChats.push(...resp.data.value);
    url = resp.data["@odata.nextLink"] || null;
  }

  console.log(`Found ${allChats.length} total chats\n`);

  // Filter for group chats with 🔥 in the topic
  const storeChats = allChats.filter(
    (c) => c.chatType === "group" && c.topic && c.topic.includes("🔥")
  );

  console.log(`Found ${storeChats.length} "🔥" store chats:\n`);

  for (const chat of storeChats) {
    console.log(`Topic: ${chat.topic}`);
    console.log(`Chat ID: ${chat.id}`);
    console.log(`Members: ${chat.members?.length || "?"}`);
    if (chat.members) {
      for (const m of chat.members) {
        console.log(`  - ${m.displayName} (${m.email || "no email"})`);
      }
    }
    console.log("---");
  }

  // Also show all group chats for reference
  console.log("\n\nAll group chats:");
  const groupChats = allChats.filter((c) => c.chatType === "group");
  for (const chat of groupChats) {
    console.log(`  ${chat.topic || "(no topic)"} → ${chat.id}`);
  }
}

main().catch(console.error);
