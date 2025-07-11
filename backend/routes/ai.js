
import express from 'express';
import OpenAI from 'openai';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Public route — summary suggestions, no auth required
router.post('/suggest/summary', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 100,
    });

    const suggestions = completion.choices[0].message.content
      .split('\n')
      .filter(Boolean);

    res.json({ suggestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'OpenAI API error' });
  }
});

// Protect all routes below — user must be logged in
router.use(authMiddleware);

// Protected route — experience and skills suggestions require auth
router.post('/suggest',async (req, res) => {
  const { prompt } = req.body;
  // const user = req.user; // Ensure user is authenticated
  // if (!user) {
  //   return res.status(401).json({ message: 'Unauthorized' });
  // }

  if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 100,
    });

    const suggestions = completion.choices[0].message.content
      .split('\n')
      .filter(Boolean);

    res.json({ suggestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'OpenAI API error' });
  }
});

export default router;
