import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

const PROMPT = `This is a South African NCR (National Credit Regulator) registration certificate or lending licence.

Extract the NCR registration number. It typically starts with "NCRCP" followed by digits (e.g. NCRCP12345).

Reply with only a JSON object: {"ncr_number": "NCRCP12345"} — use null if not found. No other text.`;

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

    const b64        = Buffer.from(await file.arrayBuffer()).toString('base64');
    const effectiveMime = isPdf ? 'application/pdf' : mimeType;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      { inlineData: { data: b64, mimeType: effectiveMime } },
      PROMPT,
    ]);

    const raw     = result.response.text().trim();
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
