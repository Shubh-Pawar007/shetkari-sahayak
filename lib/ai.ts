import type { Application } from "./types.ts";
import { missingDocs, suggestAmount, RATE_PER_HA, MAX_AREA_HA } from "./workflow.ts";

export interface Assist { source: "gemini" | "rules"; text: string }

const DOC_MR: Record<string, string> = {
  sevenTwelve: "७/१२ उतारा", aadhaarLinkedBank: "आधार-लिंक बँक खाते", photos: "नुकसानीचे फोटो", selfDeclaration: "स्वयं-घोषणापत्र",
};

/** Deterministic assistant. Always available, so the app works with no API key and tests are stable. */
export function rulesAssist(a: Application): string {
  const out: string[] = [];
  switch (a.step) {
    case "verify": {
      const m = missingDocs(a);
      if (m.length) out.push(`कमी कागदपत्रे: ${m.map((k) => DOC_MR[k]).join(", ")}. अर्जदाराला परत पाठवून हे मागवा.`);
      else out.push("सर्व कागदपत्रे आहेत. पुढील टप्प्यावर पाठवता येईल.");
      if (a.claimedAreaHa > a.landAreaHa) out.push(`लक्ष द्या: दावा केलेले क्षेत्र (${a.claimedAreaHa} हे.) ७/१२ वरील क्षेत्रापेक्षा (${a.landAreaHa} हे.) जास्त आहे.`);
      if (a.damagePercentClaimed < 33) out.push("दावा केलेले नुकसान ३३% पेक्षा कमी आहे. सहसा भरपाईसाठी पात्र नसते, पाहणीत खात्री करा.");
      break;
    }
    case "inspect":
      out.push(`शेतात तपासा: ${a.crop} पिकाचे नुकसान (${a.cause}), गट ${a.surveyNo}. अर्जदाराचा दावा ${a.damagePercentClaimed}% आहे, प्रत्यक्ष आकडा स्वतः नोंदवा.`);
      out.push("शेजारच्या शेतांशी तुलना करा आणि फोटो/जीपीएस नोंद घ्या.");
      break;
    case "assess": {
      const s = suggestAmount(a);
      if (!a.inspection) { out.push("पाहणीची नोंद उपलब्ध नाही."); break; }
      if (s === 0) out.push(`पाहणीतील नुकसान ${a.inspection.fieldDamagePercent}% आहे (३३% पेक्षा कमी). भरपाई ₹०, नाकारण्याचा विचार करा आणि कारण लिहा.`);
      else out.push(`सुचवलेली रक्कम ₹${s.toLocaleString("en-IN")} (क्षेत्र ${Math.min(a.inspection.inspectedAreaHa, a.landAreaHa, MAX_AREA_HA)} हे. x ₹${RATE_PER_HA}/हे.).`);
      if (a.inspection.fieldDamagePercent + 15 < a.damagePercentClaimed) out.push(`दावा (${a.damagePercentClaimed}%) आणि प्रत्यक्ष (${a.inspection.fieldDamagePercent}%) यात मोठा फरक आहे. नोंदीत कारण लिहा.`);
      break;
    }
    case "decide":
      out.push(`सारांश: ${a.applicantName}, ${a.village}, ${a.crop}. पाहणी ${a.inspection?.fieldDamagePercent ?? "-"}%, मंजूर रक्कम ₹${(a.assessedAmount ?? 0).toLocaleString("en-IN")}.`);
      out.push("मागील टप्प्यांच्या नोंदी तपासून निर्णय घ्या.");
      break;
  }
  return out.join("\n");
}

export async function assist(a: Application): Promise<Assist> {
  const rules = rulesAssist(a);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { source: "rules", text: rules };
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const prompt = [
    "तुम्ही महाराष्ट्रातील क्षेत्रीय शासकीय कर्मचाऱ्याला पीक नुकसान भरपाई अर्ज तपासण्यात मदत करणारे सहाय्यक आहात.",
    "फक्त मराठीत, ४ वाक्यांत, साध्या भाषेत सूचना द्या. अंतिम निर्णय कर्मचाऱ्याचा आहे, तुम्ही मंजुरी किंवा नकार देऊ नका.",
    "दिलेल्या माहितीबाहेरचे तथ्य शोधू नका. काही माहिती नसेल तर तसे सांगा.",
    `सध्याचा टप्पा: ${a.step}`,
    `अर्ज (JSON): ${JSON.stringify({ ...a, history: undefined })}`,
    `नियमांवर आधारित मसुदा सूचना: ${rules}`,
  ].join("\n");
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 400 } }),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const text: string | undefined = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("empty");
    return { source: "gemini", text: text.trim() };
  } catch {
    return { source: "rules", text: rules };
  }
}
