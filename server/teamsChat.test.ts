import { describe, it, expect } from "vitest";

// Test the chat ID mapping and HTML builders (unit tests, no network calls)
describe("Teams Chat Module", () => {
  it("has correct chat IDs for all 5 group chats", async () => {
    const { TEAMS_CHAT_IDS } = await import("./teamsChat");
    expect(TEAMS_CHAT_IDS.trd).toBe("19:3a819daf63f440c0a3eeb2390331ed6c@thread.v2");
    expect(TEAMS_CHAT_IDS.ontario).toBe("19:d45ac2a30add4c81aff992d9601418a1@thread.v2");
    expect(TEAMS_CHAT_IDS.tunnel).toBe("19:aeb41e9753f7418db1f50c832985ee02@thread.v2");
    expect(TEAMS_CHAT_IDS.mackay).toBe("19:e0c34661b5e9421ab2675ab58e535728@thread.v2");
    expect(TEAMS_CHAT_IDS.pk).toBe("19:11c65fddb9c142f3b11ef6624ce7aae3@thread.v2");
  });

  it("maps store IDs to correct chat keys", async () => {
    const { STORE_TO_CHAT } = await import("./teamsChat");
    expect(STORE_TO_CHAT["ontario"]).toBe("ontario");
    expect(STORE_TO_CHAT["tunnel"]).toBe("tunnel");
    expect(STORE_TO_CHAT["mk"]).toBe("mackay");
    expect(STORE_TO_CHAT["mackay"]).toBe("mackay");
    expect(STORE_TO_CHAT["pk"]).toBe("pk");
  });

  it("maps mk (Mackay server ID) to mackay chat", async () => {
    const { STORE_TO_CHAT, TEAMS_CHAT_IDS } = await import("./teamsChat");
    const chatKey = STORE_TO_CHAT["mk"];
    expect(chatKey).toBe("mackay");
    expect(TEAMS_CHAT_IDS[chatKey]).toBe("19:e0c34661b5e9421ab2675ab58e535728@thread.v2");
  });

  it("has all 5 expected chat keys", async () => {
    const { TEAMS_CHAT_IDS } = await import("./teamsChat");
    const keys = Object.keys(TEAMS_CHAT_IDS);
    expect(keys).toContain("trd");
    expect(keys).toContain("ontario");
    expect(keys).toContain("tunnel");
    expect(keys).toContain("mackay");
    expect(keys).toContain("pk");
    expect(keys.length).toBe(5);
  });

  it("all chat IDs follow Teams thread format", async () => {
    const { TEAMS_CHAT_IDS } = await import("./teamsChat");
    const threadPattern = /^19:[a-f0-9]+@thread\.v2$/;
    for (const [key, id] of Object.entries(TEAMS_CHAT_IDS)) {
      expect(id, `Chat ID for ${key} should match Teams thread format`).toMatch(threadPattern);
    }
  });
});
