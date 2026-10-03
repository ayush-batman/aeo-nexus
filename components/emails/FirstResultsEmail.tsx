import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components';

export default function FirstResultsEmail({ brandName, status, baseUrl }: {
  brandName: string;
  status: 'complete' | 'partial';
  baseUrl: string;
}) {
  const partial = status === 'partial';
  return (
    <Html>
      <Head />
      <Preview>{partial ? `${brandName}'s first measurement is partial.` : `${brandName}'s first AI-answer measurements are saved.`}</Preview>
      <Body style={{ backgroundColor: '#F6F5F2', color: '#202522', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '36px 16px' }}>
          <Section style={{ border: '1px solid #D8D8D2', backgroundColor: '#FFFFFF', padding: 32 }}>
            <Text style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, margin: '0 0 32px' }}>AELO / FIRST MEASUREMENT</Text>
            <Heading style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.2, margin: '0 0 20px' }}>
              {partial ? 'Your first results are partial.' : 'Your first results are ready.'}
            </Heading>
            <Text style={{ fontSize: 15, lineHeight: 1.6 }}>
              {partial
                ? `Some evidence for ${brandName} is incomplete or could not be stored. Check the returned samples, failures, and persistence status before drawing a conclusion.`
                : `We saved the first set of answers for ${brandName}. Review each question, sample count, confidence range, and provider source before deciding what to do next.`}
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 1.6 }}>
              A single answer is a receipt, not proof of a trend. The full results show what was measured and what remains uncertain.
            </Text>
            <Button href={`${baseUrl}/onboarding`} style={{ display: 'inline-block', backgroundColor: '#202522', color: '#FFFFFF', padding: '13px 20px', textDecoration: 'none', marginTop: 16 }}>
              Review the saved results
            </Button>
          </Section>
          <Text style={{ color: '#606862', fontSize: 12, lineHeight: 1.5, marginTop: 20 }}>
            This is a one-time update for your first Aelo measurement. It is not a marketing subscription.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
