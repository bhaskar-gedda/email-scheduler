import { Router } from 'express';
import { emailController } from '../controllers/email.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/scheduled', (req, res, next) => emailController.getScheduled(req, res, next));
router.get('/sent', (req, res, next) => emailController.getSent(req, res, next));
router.get('/search', (req, res, next) => emailController.searchEmails(req, res, next));

export const emailRoutes = router;
