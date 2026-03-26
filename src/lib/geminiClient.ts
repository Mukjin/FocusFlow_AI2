import { GoogleGenAI, Type } from "@google/genai";
import { StudyEvent } from "../types";

export async function enhanceEventsWithGemini<
  T extends {
    subject: string;
    phase: string;
    task: string;
    referenceLink?: string;
  },
>(
  events: T[],
  goals: string[],
  extraRequest: string,
  apiKey: string,
): Promise<T[]> {
  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY,
    });

    // Group events by subject and phase to count how many tasks we need
    const subjectPhaseCounts: Record<string, Record<string, number>> = {};
    events.forEach((e) => {
      if (!subjectPhaseCounts[e.subject]) subjectPhaseCounts[e.subject] = {};
      if (!subjectPhaseCounts[e.subject][e.phase])
        subjectPhaseCounts[e.subject][e.phase] = 0;
      subjectPhaseCounts[e.subject][e.phase]++;
    });

    const prompt = `
      사용자의 학습 목표(과목): ${goals.join(", ")}
      ${extraRequest ? `사용자의 추가 요청사항: "${extraRequest}"` : "각 과목의 특성과 학습 단계(기초/심화/마무리)에 맞게 할 일(task)을 구체적이고 실용적으로 작성해주세요."}
      
      다음은 각 과목 및 학습 단계별로 필요한 일별 학습 주제(task)의 개수입니다:
      ${JSON.stringify(subjectPhaseCounts, null, 2)}
      
      위 개수에 정확히 맞춰서 각 과목의 단계별 일별 학습 주제를 배열 형태로 작성해주세요.
      배열의 길이는 요청한 개수와 정확히 일치해야 합니다.
      또한, 각 학습 주제(task)에 대해 참고할 수 있는 유용한 실제 웹사이트 링크(공식 문서, 위키백과, 신뢰할 수 있는 블로그, 유튜브 검색 링크 등)를 하나씩 찾아 referenceLink로 제공해주세요.
      
      반드시 다음 JSON 배열 형식으로만 응답해주세요. 다른 설명은 포함하지 마세요:
      [
        {
          "subject": "과목명",
          "phase": "학습 단계",
          "tasks": [
            {
              "task": "학습 주제",
              "referenceLink": "https://..."
            }
          ]
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let resultText = response.text;
    if (!resultText) {
      throw new Error("AI 응답이 비어있습니다.");
    }

    // Extract JSON array or object from the response text
    let jsonStr = resultText;
    const arrayMatch = resultText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const objectMatch = resultText.match(/\{\s*"[\s\S]*\}\s*/);

    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    } else if (objectMatch) {
      jsonStr = objectMatch[0];
    } else {
      // Fallback to basic cleanup
      jsonStr = resultText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error(
        "Failed to parse JSON:",
        e,
        "\nOriginal Text:",
        resultText,
        "\nExtracted:",
        jsonStr,
      );
      throw new Error("AI 응답을 분석하는 데 실패했습니다.");
    }

    // Handle case where model wraps array in an object
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (Array.isArray(parsed.tasks)) {
        parsed = parsed.tasks;
      } else if (Array.isArray(parsed.data)) {
        parsed = parsed.data;
      } else {
        // Try to find any array property
        const arrayProp = Object.values(parsed).find((val) =>
          Array.isArray(val),
        );
        if (arrayProp) {
          parsed = arrayProp;
        } else {
          parsed = [parsed]; // Fallback
        }
      }
    }

    if (!Array.isArray(parsed)) {
      console.error("Parsed result is not an array:", parsed);
      throw new Error("AI 응답 형식이 올바르지 않습니다.");
    }

    // Create a map to easily consume tasks
    const taskMap: Record<
      string,
      Record<string, Array<{ task: string; referenceLink: string }>>
    > = {};
    parsed.forEach((item: any) => {
      const subj = String(item.subject || "").trim();
      const ph = String(item.phase || "").trim();
      if (!taskMap[subj]) taskMap[subj] = {};
      taskMap[subj][ph] = item.tasks || [];
    });

    // Assign tasks back to events
    const enhancedEvents = events.map((event) => {
      let newTask = event.task;
      let newReferenceLink = event.referenceLink;

      const subj = String(event.subject || "").trim();
      const ph = String(event.phase || "").trim();

      if (taskMap[subj] && taskMap[subj][ph] && taskMap[subj][ph].length > 0) {
        // Take the first task from the array and remove it
        const assignedTask = taskMap[subj][ph].shift();
        if (assignedTask) {
          newTask = assignedTask.task || event.task;
          newReferenceLink = assignedTask.referenceLink || event.referenceLink;
        }
      }

      return {
        ...event,
        task: newTask,
        referenceLink: newReferenceLink,
        aiEnhanced: true,
      };
    });

    return enhancedEvents;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
