import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);
type ImgMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const mimeType = file.type || '';
    const isPdf    = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage  = IMAGE_TYPES.has(mimeType);

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: 'Upload a PDF or image (JPG, PNG) to extract the NCR number.' },
        { status: 422 },
      );
    }

    const b64 = Buffer.from(await file.arrayBuffer()).toString('base64');

    const mediaBlock: Anthropic.MessageParam['content'][number] = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
      : { type: 'image',    source: { type: 'base64', media_type: mimeType as ImgMime, data: b64 } };

    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 128,
      messages:   [{ role: 'user', content: [mediaBlock, { type: 'text', text: PROMPT }] }],
    });

    const raw     = (msg.content[0] as Anthropic.TextBlock).text.trim();
    const cleaned = raw.replace(/```json\n?|```/g, '').trim();
    const { ncr_number } = JSON.parse(cleaned) as { ncr_number: string | null };

    return NextResponse.json({ ncr_number: ncr_number ?? null });
  } catch (err) {
    console.error('[OCR NCR]', err);
    return NextResponse.json(
      { error: 'OCR failed — please enter the NCR number manually.' },
      { status: 500 },
    );
  }
}

const PROMPT = `This is a South African NCR (National Credit Regulator) registration certificate or lending licence.

Extract the NCR registration number. It typically starts with "NCRCP" followed by digits (e.g. NCRCP12345).

Reply with only a JSON object: {"ncr_number": "NCRCP12345"} — use null if not found. No other text.`;
