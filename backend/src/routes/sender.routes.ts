import { Router } from 'express';
import { senderController, createSenderSchema } from '../controllers/sender.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => senderController.listSenders(req, res, next));
router.post('/', validateBody(createSenderSchema), (req, res, next) =>
  senderController.createSender(req, res, next)
);

export const senderRoutes = router;
