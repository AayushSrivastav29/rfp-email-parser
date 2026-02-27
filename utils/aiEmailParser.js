import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Initialize Gemini
const geminiAI = new GoogleGenAI({
  apiKey: "AIzaSyCTrHucqsPRLuitww-0TMrjlx8kAq0K9U8",
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
${emailPayload}
`;
    const response = await geminiAI.models.generateContent({
      model: "gemini-3-flash-preview",
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
    throw new Error("Failed to parse email content with AI");
  }
};
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Read the json-body.json file
// const jsonPath = path.join(__dirname, "../json-body.json");
// const jsonData = await fs.readFile(jsonPath, "utf-8");

// const emailPayload = jsonData;

// const result = await aiEmailParser(emailPayload);
// console.log(result);

// [
//   {
//     "tenderTitle": "Conference Registration Platform for the Colorado Judicial Department",
//     "subject": "Fwd: Colorado Judicial Department Has Published a New Solicitation Matching Your Profile",
//     "fromEmail": "aayush.srivastav@testlify.com",
//     "issuingAuthority": "Colorado Judicial Department",     
//     "closingDate": "2026-04-01",
//     "contractValue": null,    
//     "description": "The Colorado Judicial Department is seeking a vendor to provide a conference registration platform to support the planning process, attendee management, hotel lodging logistics, and agenda/session registration. The platform must support event websites and a mobile app to feature speakers and session specific documents.",
//     "documentLink": "https://u2200517.ct.sendgrid.net/ls/click?upn=u001.zOeG8zEbAFNSspabcbtBA1bXeOUCweFygrw2gTPMScah7bl5O-2BW5IqAa4qwGbLFCM48bRrxtDEaRRpzvn10ZwP7syrlvl16YJXSM2FdmrFcPehX32GtH4ynY0n6dwTOfzhde3qD5dMZMIvD3BmkyA-2FtAWzWLbc8p1f7-2Fgk-2BwiSMlgdHYXSPiDdemLbz3N3B7Y-2FTuLWiBHXrsQX-2BqENAAPn6c4I6nQg5j9oMKFiar3Ip2JexNFAXKPKCtM-2BNoN3yd3PMRXZSRD-2Bel5jJxF-2BIC6w-3D-3DGXZu_7ol4wTHOP9-2FhY-2F1HpKCFFuLNO7sPL9-2BDcklmqTnVeUJqbBJoSKv0d-2BtvD2Ujepcm3OiR4aNBiw-2BIRsfKjl344COMTnCgKXukR1h-2FqIYam7MnqQ00WGCCFM1Sb6FIg3B-2BxoOvxxxSXIbBSl-2BNWr-2BIDEVEz6bEX-2BWgL350IUgEbGHI8zufKYvew6Rjfy4c-2F-2FkBReZUhrmemZ0Bt2gQy0p6QY1vMGo82IWxhR1J-2B924XRRa1Kwn6Kl4UdUyXs71Zh-2B3NlJ2BB-2FLvok59iKx-2F1BCx0tfvYAZN-2BW3p4b31xl2mOkFvGj2cd0sz9oN3CTkgonrjtMoKksI88-2FjnyyGGhy-2FIQ-3D-3D"
//   }
// ]
