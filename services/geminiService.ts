import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ProjectBlueprint, GeneratedFile } from '../types';

const apiKey = process.env.API_KEY;

const fileSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    path: { type: Type.STRING, description: "Relative file path (e.g., src/App.tsx)" },
    content: { type: Type.STRING, description: "The full source code content of the file" },
    language: { type: Type.STRING, description: "The programming language (e.g., typescript, json, css)" },
  },
  required: ["path", "content", "language"],
};

const blueprintSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "A brief technical summary of the generated architecture." },
    structure: { type: Type.STRING, description: "A visual tree string representation of the folder structure." },
    files: {
      type: Type.ARRAY,
      items: fileSchema,
      description: "List of essential files to bootstrap the project.",
    },
  },
  required: ["description", "structure", "files"],
};

const stackPrompts: Record<string, string> = {
  'react-node': 'Use React with TypeScript, TailwindCSS for frontend, and Node.js/Express for backend.',
  'nextjs': 'Use Next.js 14+ with App Router, TypeScript, and TailwindCSS.',
  'esp32': 'Target ESP32 Microcontrollers using C++ (Arduino Framework) via PlatformIO. Include "platformio.ini", "src/main.cpp", and header files. Focus on embedded efficiency, WiFi connection, and sensor handling examples if applicable.',
  'python-fastapi': 'Use Python with FastAPI for the backend and a simple HTML/JS frontend.',
  'vue-firebase': 'Use Vue 3 (Composition API) and assume Firebase SDK integration.',
  'flutter': 'Use Dart and Flutter widgets.',
  'vanilla': 'Use vanilla HTML5, CSS3, and modern JavaScript (ES6+).'
};

export const generateProjectBlueprint = async (projectName: string, stackId: string): Promise<ProjectBlueprint> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const techStackInstruction = stackPrompts[stackId] || stackPrompts['react-node'];

  const systemInstruction = `You are a world-class senior software architect. 
  Your goal is to provide a COMPREHENSIVE, PRODUCTION-READY code blueprint.
  
  CRITICAL RULES:
  1. Do NOT use placeholders, TODOs, or comments like "// code goes here". Write the FULL, WORKING implementation.
  2. Provide a substantial number of files (aim for 8-15 files) to form a complete working prototype.
  3. Include ALL necessary configuration files (e.g., package.json, platformio.ini, tsconfig.json).
  4. Ensure the code is clean, modular, and follows best practices for the chosen stack (e.g., separate headers/implementation for C++).
  5. Include a robust README.md with setup and wiring instructions if hardware is involved.
  
  When asked for a project name, generate:
  1. A detailed technical description.
  2. A complete visual folder structure tree.
  3. The actual code content for the files.
  
  Return strictly JSON data adhering to the schema.`;

  const prompt = `Act as a senior developer. For the project named "${projectName}", provide the complete folder structure and EXTENSIVE, DETAILED code for the application.
  
  Technical Constraints: ${techStackInstruction}
  
  REQUIREMENTS:
  - The application must be functional, not just a shell.
  - Include distinct components, services, styles, and utility functions.
  - Ensure styling (Tailwind/CSS) is fully implemented in the components.
  - If it is an Embedded/ESP32 project: Provide wiring details in comments, handle Wi-Fi connection securely, and structure the code with clear setup() and loop() functions.
  
  Generate a high-quality, comprehensive blueprint.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: blueprintSchema,
        thinkingConfig: { thinkingBudget: 4096 }
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response generated from Gemini.");
    }

    const data = JSON.parse(text);

    return {
      projectName,
      description: data.description,
      structure: data.structure,
      files: data.files,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const enhanceProjectBlueprint = async (files: GeneratedFile[], instructions: string, projectName: string): Promise<ProjectBlueprint> => {
    if (!apiKey) {
        throw new Error("API Key is missing.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    // Prepare context from files
    // Limit to reasonable size to prevent token overflow, though Gemini 2.0 has a large context.
    const fileContext = files.map(f => `### File: ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n');
    
    const systemInstruction = `You are an expert Code Reviewer and Architect.
    Your task is to analyze an existing codebase, apply requested enhancements, fix bugs, and return the IMPROVED full version of the project.
    
    CRITICAL RULES:
    1. Return the FULL project structure, including unchanged files (unless they are irrelevant).
    2. Apply the user's specific instructions for enhancement.
    3. If no specific instructions are given, apply general best practices: clean code, better comments, improved error handling, and modern patterns.
    4. Ensure the returned JSON adheres to the schema.
    `;

    const prompt = `I have an existing project named "${projectName}".
    
    User Instructions for Enhancement: "${instructions || "General code quality improvement, optimization, and bug fixing."}"
    
    Current Project Files:
    ${fileContext}
    
    Please return the enhanced project blueprint.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: blueprintSchema,
                thinkingConfig: { thinkingBudget: 4096 }
            },
        });

        const text = response.text;
        if (!text) throw new Error("No response from Gemini.");
        
        const data = JSON.parse(text);
        
        return {
            projectName,
            description: data.description,
            structure: data.structure,
            files: data.files
        };

    } catch (error) {
        console.error("Enhancement Error:", error);
        throw error;
    }
};