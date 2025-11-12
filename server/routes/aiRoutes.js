import express from 'express';
import { auth } from '../middlewares/auth.js';
import { generateArticle, generateEmail, generateImage } from '../controllers/aiController.js';

const aiRouter= express.Router();

aiRouter.post('/generate-article', auth, generateArticle);
aiRouter.post('/generate-email', auth , generateEmail);
aiRouter.post('/generate-image', auth, generateImage);


export default aiRouter;