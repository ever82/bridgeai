import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/common';
import { ApiResponse } from '../../utils/response';
import { AppError } from '../../errors/AppError';
import * as offerExtractionService from '../../services/ai/offerExtractionService';
import * as offerService from '../../services/offerService';

const router: Router = Router();

/**
 * @route POST /api/v1/ai/offers/extract
 * @desc Extract offer information from natural language
 * @access Private
 */
router.post(
  '/offers/extract',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { text, merchantId, autoCreate } = req.body;

    if (!text) {
      throw new AppError('Text is required', 'MISSING_TEXT', 400);
    }

    if (!merchantId) {
      throw new AppError('Merchant ID is required', 'MISSING_MERCHANT_ID', 400);
    }

    // Process natural language offer
    const result = await offerExtractionService.processNaturalLanguageOffer(text, merchantId);

    if (!result.success || !result.data) {
      throw new AppError(
        `Failed to extract offer: ${result.errors?.join(', ')}`,
        'EXTRACTION_FAILED',
        400
      );
    }

    // If autoCreate is true, create the offer immediately
    if (autoCreate) {
      const offer = await offerService.createOfferFromAI(merchantId, result.data);
      res.json(ApiResponse.success({
        extracted: result.data,
        offer,
        message: 'Offer created successfully from AI extraction',
      }));
    } else {
      // Just return the extracted data for review
      res.json(ApiResponse.success({
        extracted: result.data,
        message: 'Offer extracted successfully. Review and create manually.',
      }));
    }
  })
);

/**
 * @route POST /api/v1/ai/offers/preview
 * @desc Preview offer extraction without creating
 * @access Private
 */
router.post(
  '/offers/preview',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { text } = req.body;

    if (!text) {
      throw new AppError('Text is required', 'MISSING_TEXT', 400);
    }

    // Extract offer information
    const extractedData = await offerExtractionService.extractOfferFromText(text);
    const validation = offerExtractionService.validateExtractedData(extractedData);

    res.json(ApiResponse.success({
      extracted: extractedData,
      validation,
      message: validation.valid
        ? 'Offer extracted successfully'
        : 'Offer extracted with warnings',
    }));
  })
);

export default router;
