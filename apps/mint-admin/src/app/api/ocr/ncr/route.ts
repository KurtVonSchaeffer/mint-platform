import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

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

    const fileBlock = {
      type:      'file' as const,
      data:      b64,
      mediaType: (isPdf ? 'application/pdf' : mimeType) as string,
    };

    const { text } = await generateText({
      model: google('gemini-2.0-flash'),
      messages: [{
        role: 'user',
        content: [
          fileBlock,
          { type: 'text', text: PROMPT },
        ],
      }],
      maxOutputTokens: 128,
    });

    const cleaned = text.trim().replace(/```json\n?|```/g, '').trim();
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
