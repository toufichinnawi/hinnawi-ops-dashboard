import { ENV } from "./_core/env";

interface TeamsNotificationPayload {
  reportType: string;
  location: string;
  submittedBy: string;
  reportDate: string;
  totalScore?: string | null;
  details?: Record<string, any>;
}

export async function sendTeamsNotification(
  payload: TeamsNotificationPayload
): Promise<boolean> {
  const webhookUrl = ENV.teamsWebhookUrl;
  if (!webhookUrl) {
    console.warn("[Teams] No webhook URL configured, skipping notification");
    return false;
  }

  try {
    const scoreText = payload.totalScore
      ? `**Score:** ${payload.totalScore}`
      : "";

    let detailsSummary = "";
    if (payload.details) {
      const sections = Object.entries(payload.details);
      if (sections.length > 0) {
        detailsSummary = sections
          .slice(0, 5)
          .map(([key, val]) => {
            if (typeof val === "object" && val !== null) {
              const entries = Object.entries(val);
              const completed = entries.filter(
                ([, v]) =>
                  v === true || v === "yes" || v === "completed"
              ).length;
              return `- ${key}: ${completed}/${entries.length} completed`;
            }
            return `- ${key}: ${val}`;
          })
          .join("\n");
      }
    }

    const reportTypeDisplay = payload.reportType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const card = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          contentUrl: null,
          content: {
            $schema:
              "http://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.4",
            body: [
              {
                type: "Container",
                style: "emphasis",
                items: [
                  {
                    type: "TextBlock",
                    text: `📋 ${reportTypeDisplay}`,
                    weight: "Bolder",
                    size: "Medium",
                    color: "Accent",
                  },
                ],
              },
              {
                type: "FactSet",
                facts: [
                  { title: "Store", value: payload.location },
                  {
                    title: "Submitted By",
                    value: payload.submittedBy,
                  },
                  { title: "Date", value: payload.reportDate },
                  ...(payload.totalScore
                    ? [
                        {
                          title: "Score",
                          value: payload.totalScore,
                        },
                      ]
                    : []),
                ],
              },
              ...(detailsSummary
                ? [
                    {
                      type: "TextBlock",
                      text: "**Summary:**",
                      wrap: true,
                      spacing: "Medium",
                    },
                    {
                      type: "TextBlock",
                      text: detailsSummary,
                      wrap: true,
                      size: "Small",
                    },
                  ]
                : []),
            ],
          },
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `[Teams] Webhook failed (${response.status}): ${text}`
      );
      return false;
    }

    console.log(
      `[Teams] Notification sent for ${reportTypeDisplay} at ${payload.location}`
    );
    return true;
  } catch (error) {
    console.error("[Teams] Failed to send notification:", error);
    return false;
  }
}
