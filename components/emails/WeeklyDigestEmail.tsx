import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import type { WeeklyDecisionInbox } from "../../lib/weekly-inbox";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aelohq.com";

export default function WeeklyDigestEmail({ brand, inbox }: { brand: string; inbox: WeeklyDecisionInbox }) {
  const losses = inbox.items.filter(item => item.direction === "regressed").length;
  const preview = `${brand}: ${inbox.items.length} confidence-qualified change${inbox.items.length === 1 ? "" : "s"} this week`;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ background: "#f4f4f5", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ margin: "0 auto", padding: "40px 16px", maxWidth: "600px" }}>
          <Section style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: "12px", padding: "32px" }}>
            <Text style={{ color: "#71717a", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px" }}>
              Weekly decision inbox · {brand}
            </Text>
            <Heading style={{ color: "#18181b", fontSize: "24px", lineHeight: "1.3" }}>
              {inbox.items.length} observed change{inbox.items.length === 1 ? "" : "s"} worth reviewing
            </Heading>
            <Text style={{ color: "#52525b", fontSize: "14px", lineHeight: "1.6" }}>
              Each item has at least four samples in both weeks and non-overlapping 95% confidence ranges. {losses ? `${losses} moved down and may need attention.` : "No confidence-qualified losses were found."}
            </Text>
            {inbox.items.slice(0, 6).map(item => (
              <Section key={item.id} style={{ borderTop: "1px solid #e4e4e7", padding: "16px 0" }}>
                <Text style={{ color: item.direction === "regressed" ? "#b91c1c" : "#15803d", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>
                  {item.engine} · {item.changePoints > 0 ? "+" : ""}{item.changePoints} points
                </Text>
                <Text style={{ color: "#18181b", fontSize: "15px", fontWeight: "600" }}>{item.prompt}</Text>
                <Text style={{ color: "#52525b", fontSize: "13px", lineHeight: "1.5" }}>{item.whyItMatters}</Text>
                <Text style={{ color: "#71717a", fontSize: "12px" }}>
                  {Math.round((item.previous.mentionRate ?? 0) * 100)}% (n={item.previous.sampleCount}) → {Math.round((item.current.mentionRate ?? 0) * 100)}% (n={item.current.sampleCount}) · Next: {item.action?.title ?? "review and assign an action"}
                </Text>
              </Section>
            ))}
            <Section style={{ textAlign: "center", marginTop: "24px" }}>
              <Button href={`${baseUrl}/dashboard`} style={{ background: "#18181b", color: "#fff", borderRadius: "8px", padding: "12px 20px" }}>
                Open decision inbox
              </Button>
            </Section>
          </Section>
          <Text style={{ color: "#71717a", fontSize: "11px", textAlign: "center", marginTop: "24px" }}>
            Weekly digest. Manage in Settings → Notifications.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
