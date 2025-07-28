import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface CodeGenerationRequest {
  prompt: string;
  language?: string;
  framework?: string;
  context?: string;
}

export interface CodeGenerationResponse {
  code: string;
  explanation: string;
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  creditsUsed: number;
}

export async function generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
  const { prompt, language = "javascript", framework = "react", context = "" } = request;

  const systemPrompt = `You are an expert software engineer and AI coding assistant. Generate clean, production-ready code based on the user's requirements.

Guidelines:
- Generate complete, functional code
- Follow best practices for ${language} and ${framework}
- Include proper error handling
- Add helpful comments
- Structure code in multiple files if needed
- Ensure code is modern and uses latest conventions

Respond with JSON in this exact format:
{
  "explanation": "Brief explanation of what the code does",
  "files": [
    {
      "path": "filename.ext",
      "content": "file content here",
      "language": "javascript"
    }
  ]
}`;

  const userPrompt = `${context ? `Context: ${context}\n\n` : ""}Generate ${language} code using ${framework} for: ${prompt}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Calculate credits used based on tokens (rough estimation)
    const creditsUsed = Math.ceil((response.usage?.total_tokens || 1000) / 100);

    return {
      code: result.files?.[0]?.content || "",
      explanation: result.explanation || "Code generated successfully",
      files: result.files || [],
      creditsUsed
    };
  } catch (error: any) {
    throw new Error(`Failed to generate code: ${error.message}`);
  }
}

export async function chatWithAI(messages: Array<{ role: string; content: string }>): Promise<{
  response: string;
  creditsUsed: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI coding assistant. Provide clear, concise responses about programming, debugging, and software development."
        },
        ...messages.map(msg => ({ role: msg.role as "user" | "assistant", content: msg.content }))
      ],
      temperature: 0.7,
    });

    const creditsUsed = Math.ceil((response.usage?.total_tokens || 500) / 100);

    return {
      response: response.choices[0].message.content || "I couldn't generate a response.",
      creditsUsed
    };
  } catch (error: any) {
    throw new Error(`Failed to chat with AI: ${error.message}`);
  }
}
