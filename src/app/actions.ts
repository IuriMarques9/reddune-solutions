"use server";

import { generateAboutUsContent, type GenerateAboutUsContentInput } from "@/ai/flows/generate-about-us-content";

export async function generateAboutContentAction(input: GenerateAboutUsContentInput) {
    try {
        const result = await generateAboutUsContent(input);
        return { success: true, data: result };
    } catch (error) {
        console.error("Error in generateAboutContentAction:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: `Failed to generate content: ${errorMessage}` };
    }
}
