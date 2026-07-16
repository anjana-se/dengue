import { config } from './config/env';
import fs from 'node:fs';
import path from 'node:path';
import { buildVisionSystemPrompt, buildVisionUserPrompt } from './integrations/gemini/promptTemplates/systemPrompts';

async function testNemotronNoJsonFormat() {
  console.log('Testing nemotron-3-nano-omni-30b-a3b-reasoning WITHOUT response_format...');
  
  const imagePath = path.resolve('uploads/reports/2026/07/16/1784176224407-aijx4p6jaja.jpg');
  if (!fs.existsSync(imagePath)) {
    console.error('Test image not found:', imagePath);
    process.exit(1);
  }

  const imageBytes = fs.readFileSync(imagePath);
  const base64Image = imageBytes.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64Image}`;

  const systemPrompt = buildVisionSystemPrompt();
  const userPrompt = buildVisionUserPrompt();

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: dataUrl,
          },
        },
        {
          type: 'text',
          text: `${systemPrompt}\n\n${userPrompt}`,
        },
      ],
    },
  ];

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('Request timed out after 30 seconds!');
    controller.abort();
  }, 30000);

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
        messages,
        temperature: 0.2,
        top_p: 0.95,
        max_tokens: 1024,
        stream: false,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('Response status:', response.status);
    console.log('Duration:', (Date.now() - startTime) / 1000, 'seconds');
    
    const data: any = await response.json();
    if (response.ok) {
      console.log('Response content:', data.choices?.[0]?.message?.content);
    } else {
      console.log('Error response:', JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('Request failed:', err.message);
  }
}

testNemotronNoJsonFormat();
