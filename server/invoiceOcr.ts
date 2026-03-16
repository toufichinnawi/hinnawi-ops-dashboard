/**
 * Invoice OCR Service — Uses Forge API (Gemini 2.5 Flash) vision model
 * to extract structured data from invoice photos
 */
import { ENV } from "./_core/env";

interface LineItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
}

export interface OcrResult {
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null; // YYYY-MM-DD
  lineItems: LineItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  rawText: string;
}

const KNOWN_VENDORS = [
  "Gordon/GFS",
  "Dube Loiselle",
  "Costco",
  "Fernando",
  "JG Rive Sud",
];

export async function extractInvoiceData(imageUrl: string): Promise<OcrResult> {
  const apiUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!apiUrl || !apiKey) {
    throw new Error("Forge API credentials not configured");
  }

  const prompt = `You are an invoice data extraction assistant. Analyze this invoice image and extract the following information in JSON format:

{
  "vendorName": "The vendor/supplier name (match to one of these known vendors if possible: ${KNOWN_VENDORS.join(", ")})",
  "invoiceNumber": "The invoice or receipt number",
  "invoiceDate": "The invoice date in YYYY-MM-DD format",
  "lineItems": [
    {
      "description": "Item description",
      "quantity": 1,
      "unitPrice": 10.00,
      "total": 10.00
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "rawText": "Full text content of the invoice"
}

Rules:
- Return ONLY valid JSON, no markdown or explanation
- Use null for any field you cannot determine
- Prices should be numbers (not strings)
- Date must be YYYY-MM-DD format
- For vendor name, try to match to one of the known vendors listed above
- Extract as many line items as visible
- If the image is unclear or not an invoice, still return the JSON structure with null values`;

  const response = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Invoice OCR] API error:", response.status, errText);
    throw new Error(`OCR API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse the JSON from the response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Invoice OCR] No JSON found in response:", content);
      return {
        vendorName: null,
        invoiceNumber: null,
        invoiceDate: null,
        lineItems: [],
        subtotal: null,
        tax: null,
        total: null,
        rawText: content,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      vendorName: parsed.vendorName || null,
      invoiceNumber: parsed.invoiceNumber || null,
      invoiceDate: parsed.invoiceDate || null,
      lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
      subtotal: typeof parsed.subtotal === "number" ? parsed.subtotal : null,
      tax: typeof parsed.tax === "number" ? parsed.tax : null,
      total: typeof parsed.total === "number" ? parsed.total : null,
      rawText: parsed.rawText || content,
    };
  } catch (parseErr) {
    console.error("[Invoice OCR] JSON parse error:", parseErr);
    return {
      vendorName: null,
      invoiceNumber: null,
      invoiceDate: null,
      lineItems: [],
      subtotal: null,
      tax: null,
      total: null,
      rawText: content,
    };
  }
}

/**
 * Extract invoice data from multiple page images at once.
 * All images are sent in a single AI request so the model can
 * cross-reference line items on page 1 with totals on page 3, etc.
 */
export async function extractInvoiceDataMultiPage(imageUrls: string[]): Promise<OcrResult> {
  // If only one page, delegate to the single-page function
  if (imageUrls.length === 1) {
    return extractInvoiceData(imageUrls[0]);
  }

  const apiUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!apiUrl || !apiKey) {
    throw new Error("Forge API credentials not configured");
  }

  const prompt = `You are an invoice data extraction assistant. You are given ${imageUrls.length} pages of the SAME invoice. Analyze ALL pages together as one complete invoice and extract the following information in JSON format:

{
  "vendorName": "The vendor/supplier name (match to one of these known vendors if possible: ${KNOWN_VENDORS.join(", ")})",
  "invoiceNumber": "The invoice or receipt number",
  "invoiceDate": "The invoice date in YYYY-MM-DD format",
  "lineItems": [
    {
      "description": "Item description",
      "quantity": 1,
      "unitPrice": 10.00,
      "total": 10.00
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "rawText": "Full text content of the invoice from all pages combined"
}

Rules:
- This is a MULTI-PAGE invoice — combine data from ALL pages into one result
- Return ONLY valid JSON, no markdown or explanation
- Use null for any field you cannot determine
- Prices should be numbers (not strings)
- Date must be YYYY-MM-DD format
- For vendor name, try to match to one of the known vendors listed above
- Extract ALL line items across ALL pages — do not skip items from later pages
- The subtotal, tax, and total should reflect the FINAL totals (usually on the last page)
- If the images are unclear or not an invoice, still return the JSON structure with null values`;

  // Build content array: text prompt + all page images
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text: prompt },
  ];
  for (let i = 0; i < imageUrls.length; i++) {
    content.push({
      type: "text",
      text: `--- Page ${i + 1} of ${imageUrls.length} ---`,
    });
    content.push({
      type: "image_url",
      image_url: { url: imageUrls[i] },
    });
  }

  const response = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content,
        },
      ],
      max_tokens: 8192,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Invoice OCR Multi] API error:", response.status, errText);
    throw new Error(`OCR API error: ${response.status}`);
  }

  const data = await response.json();
  const responseContent = data.choices?.[0]?.message?.content || "";

  try {
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Invoice OCR Multi] No JSON found in response:", responseContent);
      return {
        vendorName: null,
        invoiceNumber: null,
        invoiceDate: null,
        lineItems: [],
        subtotal: null,
        tax: null,
        total: null,
        rawText: responseContent,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      vendorName: parsed.vendorName || null,
      invoiceNumber: parsed.invoiceNumber || null,
      invoiceDate: parsed.invoiceDate || null,
      lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
      subtotal: typeof parsed.subtotal === "number" ? parsed.subtotal : null,
      tax: typeof parsed.tax === "number" ? parsed.tax : null,
      total: typeof parsed.total === "number" ? parsed.total : null,
      rawText: parsed.rawText || responseContent,
    };
  } catch (parseErr) {
    console.error("[Invoice OCR Multi] JSON parse error:", parseErr);
    return {
      vendorName: null,
      invoiceNumber: null,
      invoiceDate: null,
      lineItems: [],
      subtotal: null,
      tax: null,
      total: null,
      rawText: responseContent,
    };
  }
}
