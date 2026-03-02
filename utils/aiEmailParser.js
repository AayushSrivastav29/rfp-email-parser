import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

// Initialize Gemini
const geminiAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// AI-powered parsing function
export const aiEmailParser = async (TextBody) => {
  try {
    const prompt = `Role: You are a strict Procurement Auditor and Data Extraction specialist. Your task is to analyze inbound email TextBody to identify ONLY formal government or corporate procurement tenders (RFP, RFQ, RFT, IFB, or EOI).

Definition of a Tender:
A formal solicitation for the provision of goods or services. It MUST be an actionable bid opportunity where a company can submit a proposal. Formal types include Registration of Interest, Request for Proposal (RFP), Request for Quotation (RFQ), and Request for Tender (RFT).

Exclusion Criteria (DO NOT EXTRACT):
1. Events: Seminars, webinars, open houses, or networking meetups (e.g., "Pennovation Open House").
2. Educational News: Industry reports, venture reports, or ecosystem updates.
3. Competitions: Pitch competitions, "venture building weekends," or hackathons (e.g., "Road to the Lioncage").
4. General Grants: Small seed grants for founders that do not follow a formal procurement bid process.
5. Marketing: General "call for makers" or "call for speakers" for a faire or conference.
6. Reminders: General Tenders deadlines reminders.

Wait Test for Accuracy:
Apply the "Wait Test" logic: If the section is a "Go Ahead" signal (confirming a news item or event), IGNORE it. If it is a "Stop & Turn" signal (a specific requirement or bid notice with a response deadline), EXTRACT it.

Instructions:
1. Analyze the TextBody field.
2. Identify objects that meet the "Tender" definition and avoid all "Exclusion Criteria".
3. If NO formal tenders are found, return an empty array.
4. For each VALID tender, extract:
   - tenderTitle: Specific name of the bid opportunity or title of the solicitation.
   - issuingAuthority: The name of the agency, government body, or department that issued the bid.
   - deadline: The response deadline or proposed deadline or closing date. Format as DD-MM-YYYY if possible.
   - contractValue: Estimated budget or value of the tender (with currency).
   - description: A technical summary of the scope of work.
   - extractedLinks: The primary URL provided to view the notice or download the bid documents. Ignore any links related to 'Unsubscribe', 'Email Preferences', 'Account Settings', or 'Help Center'. Only extract URLs that link directly to a specific solicitation or project folder. The URL must NOT contain repeating patterns like "-2F4o-2F3o-2F4o" or similar encoded garbage loops.

Constraint: 
- If a field is missing, set it to null.

Output Format: Return ONLY a valid JSON array. Do not include conversational text, markdown formatting blocks, or explanations.

Input Data:
${JSON.stringify(TextBody)}`;
    const response = await geminiAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tenderTitle: { type: "string" },
              issuingAuthority: { type: "string" },
              deadline: { type: "string" },
              contractValue: { type: "string" },
              description: { type: "string" },
              extractedLinks: { type: "array", items: { type: "string" } },
            },
          },
        },
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    });
    console.log("response", response.candidates[0].content);
    const extractedContent = response.candidates[0].content.parts[0].text;
    console.log("extractedContent", extractedContent);
    // Clean up the response to ensure it's valid JSON
    let cleanedContent = extractedContent;
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent
        .replace(/```json\n?/, "")
        .replace(/```$/, "");
    }
    if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.replace(/```\n?/, "").replace(/```$/, "");
    }

    const parsedData = await JSON.parse(cleanedContent);
    console.log("parsedData", parsedData);
    return parsedData;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("JSON parse failed:", error.message);
    } else {
      console.error("AI parsing error:", error.message);
    }
    return [];
  }
};

export const aifilterEmails = async (data) => {
  try {
    const prompt = `
    Role: You are a Strategic Procurement Analyst for Testlify, a company specializing in talent assessment, psychometric testing, and AI-powered recruitment software. Your goal is to filter a list of tenders and identify only those that align with the company's core business.

Company Profile & Alignment Criteria:
Testlify is a match if the tender falls into EITHER of the following groups:

Technical Software Services (NAICS Focus): Any project involving custom software development, IT systems design, cloud hosting, or infrastructure.

Target Codes: 541511, 541512, 513210, 541519, 541513, 541330, 518210.

Assessment & Talent Services (Keyword Focus): Any project involving the following terms or their semantic equivalents:

Keywords: psychometric, assessment centre, recruitment services, talent development, CPV 79600000, 79600000, 79635000, CPV 79635000, AI interviewing, Workforce development, Leadership assessment.

Instructions:

Review the tenderTitle, subject, and description of each object in the provided JSON array.

Assign a Relevance Score (0-100) based on how closely the requirements match Testlify's services.

Assign a Classification:

High Priority: Score 80-100 (Direct match for assessment software or custom programming).

Medium: Score 50-79 (Broad HR services or general IT support that might include a software component).

Low: Score 20-49 (Tangentially related, e.g., general consulting).

Irrelevant: Score 0-19 (Construction, manual labor, hardware-only, or unrelated sectors).

Negative Filter: Explicitly reject tenders for "Staff Augmentation" or "Temporary Staffing" unless they specifically require an assessment platform or AI screening tool.

Output Format:
Return ONLY a valid JSON array containing the original data plus three new keys: relevanceScore, classification, and matchReasoning. Do not include markdown formatting or conversational text.

Input Data:
${JSON.stringify(data)}
`;

    const response = await geminiAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        max_tokens: 2000,
      },
    });
    const extractedContent = response.candidates[0].content.parts[0].text;
    // Clean up the response to ensure it's valid JSON
    let cleanedContent = extractedContent;
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent
        .replace(/```json\n?/, "")
        .replace(/```$/, "");
    }
    if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.replace(/```\n?/, "").replace(/```$/, "");
    }

    const parsedData = await JSON.parse(cleanedContent);
    return parsedData;
  } catch (error) {
    console.error("AI parsing error:", error);
    return null;
  }
};
