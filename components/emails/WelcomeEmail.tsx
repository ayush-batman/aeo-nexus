import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components';

export default function WelcomeEmail({ firstName, baseUrl }: { firstName: string; baseUrl: string }) {
  return (
    <Html>
      <Head />
      <Preview>Start with the questions your buyers actually ask.</Preview>
      <Body style={{ backgroundColor: '#F6F5F2', color: '#202522', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '36px 16px' }}>
          <Section style={{ border: '1px solid #D8D8D2', backgroundColor: '#FFFFFF', padding: 32 }}>
            <Text style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, margin: '0 0 32px' }}>AELO</Text>
            <Heading style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.2, margin: '0 0 20px' }}>Your workspace is ready.</Heading>
            <Text style={{ fontSize: 15, lineHeight: 1.6 }}>Hi {firstName},</Text>
            <Text style={{ fontSize: 15, lineHeight: 1.6 }}>
              Aelo measures the answers AI assistants give to your buyers. To start, add your brand and three to five questions a buyer might ask before choosing a product like yours.
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 1.6 }}>
              We&apos;ll save each returned answer and show which sources the provider cited. If a scan fails, you&apos;ll see the failure rather than a made-up score.
            </Text>
            <Button href={`${baseUrl}/onboarding`} style={{ display: 'inline-block', backgroundColor: '#202522', color: '#FFFFFF', padding: '13px 20px', textDecoration: 'none', marginTop: 16 }}>
              Set up your first measurement
            </Button>
          </Section>
          <Text style={{ color: '#606862', fontSize: 12, lineHeight: 1.5, marginTop: 20 }}>
            This account email was sent because you created a verified Aelo account. It is not a marketing subscription.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
