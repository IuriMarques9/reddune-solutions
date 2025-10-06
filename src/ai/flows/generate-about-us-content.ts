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
    .describe('Uma descrição detalhada da empresa, sua missão e valores.'),
  targetAudience: z
    .string()
    .describe('Descrição do público-alvo da empresa.'),
  brandVoice: z.string().describe('A voz e o tom de marca desejados.'),
  additionalKeywords: z
    .string()
    .describe('Quaisquer palavras-chave adicionais a serem incluídas no conteúdo.'),
});
export type GenerateAboutUsContentInput = z.infer<typeof GenerateAboutUsContentInputSchema>;

const GenerateAboutUsContentOutputSchema = z.object({
  aboutUsContent: z
    .string()
    .describe('Conteúdo gerado para a seção "Sobre Nós" do site.'),
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
  prompt: `Você é um redator especialista em criar conteúdo para a seção "Sobre Nós" de sites de empresas.

Você usará as informações fornecidas para gerar conteúdo atraente e envolvente que se alinhe com a voz da marca. Responda em português.

Descrição da Empresa: {{{companyDescription}}}
Público-alvo: {{{targetAudience}}}
Voz da Marca: {{{brandVoice}}}
Palavras-chave Adicionais: {{{additionalKeywords}}}

Gere conteúdo para a seção "Sobre Nós" que seja informativo, envolvente e persuasivo.`,
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
