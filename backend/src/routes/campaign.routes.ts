import { Router } from 'express';
import multer from 'multer';
import { campaignController, createCampaignSchema } from '../controllers/campaign.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const router = Router();

router.use(requireAuth);

router.post('/preview-leads', upload.single('file'), (req, res, next) =>
  campaignController.previewLeads(req, res, next)
);
router.post('/', validateBody(createCampaignSchema), (req, res, next) =>
  campaignController.createCampaign(req, res, next)
);
router.get('/:id', (req, res, next) => campaignController.getCampaign(req, res, next));

export const campaignRoutes = router;
