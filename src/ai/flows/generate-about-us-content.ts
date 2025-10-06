'use server';
/**
 * @fileOverview An AI agent to generate content suggestions for the 'About Us' section of a website.
 *
 * - generateAboutUsContent - A function that generates content for the about us section.
 * - GenerateAboutUsContentInput - The input type for the generateAboutUsContent function.
 * - GenerateAboutUsContentOutput - The return type for the generateAboutUsContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAboutUsContentInputSchema = z.object({
  companyDescription: z
    .string()
    .describe('A detailed description of the company, its mission, and values.'),
  targetAudience: z
    .string()
    .describe('Description of the target audience for the company.'),
  brandVoice: z.string().describe('The desired brand voice and tone.'),
  additionalKeywords: z
    .string()
    .describe('Any additional keywords to include in the content.'),
});
export type GenerateAboutUsContentInput = z.infer<typeof GenerateAboutUsContentInputSchema>;

const GenerateAboutUsContentOutputSchema = z.object({
  aboutUsContent: z
    .string()
    .describe('Generated content for the About Us section of the website.'),
});
export type GenerateAboutUsContentOutput = z.infer<typeof GenerateAboutUsContentOutputSchema>;

export async function generateAboutUsContent(
  input: GenerateAboutUsContentInput
): Promise<GenerateAboutUsContentOutput> {
  return generateAboutUsContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAboutUsContentPrompt',
  input: {schema: GenerateAboutUsContentInputSchema},
  output: {schema: GenerateAboutUsContentOutputSchema},
  prompt: `You are an expert copywriter specializing in creating About Us content for company websites.

You will use the provided information to generate compelling and engaging content that aligns with the brand voice.

Company Description: {{{companyDescription}}}
Target Audience: {{{targetAudience}}}
Brand Voice: {{{brandVoice}}}
Additional Keywords: {{{additionalKeywords}}}

Generate content for the About Us section that is informative, engaging, and persuasive.`,
});

const generateAboutUsContentFlow = ai.defineFlow(
  {
    name: 'generateAboutUsContentFlow',
    inputSchema: GenerateAboutUsContentInputSchema,
    outputSchema: GenerateAboutUsContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
