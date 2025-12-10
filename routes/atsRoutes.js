const express = require('express');
const router = express.Router();
const multer = require('multer');
const atsController = require('../controllers/atsController');

/**
 * @swagger
 * tags:
 *   - name: ATS
 *     description: ATS Pipeline - Resume validation endpoints
 */

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB (theo yêu cầu Layer 2)
  },
  fileFilter: (req, file, cb) => {
    // Chỉ chấp nhận PDF
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * @swagger
 * /api/v1/ats/validate:
 *   post:
 *     summary: Validate Resume PDF
 *     description: |
 *       Validate if uploaded PDF file is a valid CV/Resume using 4-layer ATS pipeline:
 *       1. Magic Byte & Hex Signature check
 *       2. File size (≤5MB) and page count (≤5 pages)
 *       3. Text content validation (not image-only)
 *       4. Vision API check (CV/Resume detection)
 *     tags: [ATS]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to validate
 *     responses:
 *       200:
 *         description: Validation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                     details:
 *                       type: object
 *       400:
 *         description: Validation failed or invalid file
 *       500:
 *         description: Internal server error
 */
router.post('/validate', upload.single('file'), (req, res) => {
  atsController.validateResume.call(atsController, req, res);
});

/**
 * @swagger
 * /api/v1/ats/health:
 *   get:
 *     summary: ATS Pipeline health check
 *     description: Check if ATS Pipeline service is operational
 *     tags: [ATS]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', (req, res) => {
  atsController.healthCheck.call(atsController, req, res);
});

module.exports = router;
