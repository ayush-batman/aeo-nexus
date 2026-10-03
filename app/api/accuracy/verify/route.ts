import { startAnalysis } from '@/lib/analysis-http';
export async function POST() { return startAnalysis('accuracy'); }
