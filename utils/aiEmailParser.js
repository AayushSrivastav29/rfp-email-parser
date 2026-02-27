import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

// Initialize Gemini
const geminiAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// AI-powered parsing function
export const aiEmailParser = async (emailPayload) => {
  try {
    const prompt = `Role: You are a highly accurate Procurement Data Extraction specialist. Your task is to parse inbound email payloads from tender notification services and convert them into a valid JSON array of objects.

Input Format: You will receive a JSON payload from a Postmark inbound webhook.

Instructions:

Analyze the Subject, TextBody, and HtmlBody fields of the input JSON.

Identify all individual contract opportunities (tenders) listed in the email.

For each tender identified, extract the following specific fields:

tenderTitle: The specific name or title of the solicitation.

issuingAuthority: The name of the agency, government body, or department that issued the bid.

deadline: The response deadline or proposed deadline or closing date. Format as DD-MM-YYYY if possible.

contractValue: The estimated budget or value (if mentioned). Include the currency.

description: A concise 2-3 sentence summary of the scope of work.

extractedLinks: The primary URL provided to view the notice or download the bid documents. Ignore any links related to 'Unsubscribe', 'Email Preferences', 'Account Settings', or 'Help Center'. Only extract URLs that link directly to a specific solicitation or project folder.

Constraint: If a field is not present, set its value to null.

Output Format: Return ONLY a valid JSON array. Do not include conversational text, markdown formatting blocks, or explanations.

Input Data:
${JSON.stringify(emailPayload)}
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
    console.error("AI parsing error:", error);
    return null;
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
