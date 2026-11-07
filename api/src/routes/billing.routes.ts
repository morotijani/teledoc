import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { SubscriptionStatus, PaymentStatus } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { HubtelPaymentService } from '../services/hubtel.service';
import { sendPushNotification } from '../lib/notifications';

const router = Router();

/**
 * Get Subscription & Free Trial Status
 */
router.get('/subscription-status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const patientId = req.user!.id;

    let subscription = await prisma.subscription.findUnique({
      where: { patientId },
    });

    const now = new Date();

    if (!subscription) {
      // Create initial 90-day trial automatically
      const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      subscription = await prisma.subscription.create({
        data: {
          patientId,
          status: SubscriptionStatus.TRIAL,
          trialStartsAt: now,
          trialEndsAt,
          amountGhs: 10.0,
        },
      });
    }

    const isTrial = subscription.status === SubscriptionStatus.TRIAL;
    const daysRemaining = Math.max(
      0,
      Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    const isAccessAllowed =
      (isTrial && now <= subscription.trialEndsAt) ||
      (subscription.status === SubscriptionStatus.ACTIVE &&
        (!subscription.nextBillingDue || now <= subscription.nextBillingDue));

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialStartsAt: subscription.trialStartsAt,
        trialEndsAt: subscription.trialEndsAt,
        daysRemainingInTrial: isTrial ? daysRemaining : 0,
        nextBillingDue: subscription.nextBillingDue,
        monthlyRateGhs: Number(subscription.amountGhs),
        isAccessAllowed,
      },
    });
  } catch (error) {
    console.error('[Subscription Status Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve subscription status.' });
  }
});

/**
 * Initiate Hubtel Subscription Payment (10 GHS / Month)
 */
router.post('/pay-subscription', authenticateToken, async (req: Request, res: Response) => {
  try {
    const patientId = req.user!.id;
    const { phoneNumber, channel } = req.body;

    const patient = await prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found.' });
      return;
    }

    const payPhone = phoneNumber || patient.phoneNumber;
    const clientReference = `TD_SUB_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const amount = 10.0; // 10 GHS monthly

    // Record pending transaction
    await prisma.paymentTransaction.create({
      data: {
        patientId,
        transactionRef: clientReference,
        amount,
        channel: channel || 'MOMO',
        status: PaymentStatus.PENDING,
      },
    });

    // Request checkout from Hubtel API
    const hubtelResult = await HubtelPaymentService.initiateSubscriptionCheckout({
      patientId,
      phoneNumber: payPhone,
      amount,
      channel,
      clientReference,
      description: 'TeleDoc Monthly Subscription - 10 GHS',
    });

    if (!hubtelResult.success) {
      res.status(502).json({
        success: false,
        message: hubtelResult.message || 'Payment initiation failed with Hubtel gateway.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Payment checkout initiated.',
      clientReference,
      checkoutUrl: hubtelResult.checkoutUrl,
      transactionId: hubtelResult.transactionId,
      amountGhs: amount,
    });
  } catch (error) {
    console.error('[Pay Subscription Error]', error);
    res.status(500).json({ success: false, message: 'Internal server error while processing payment.' });
  }
});

/**
 * Hubtel Webhook Callback Handler
 */
router.post('/webhooks/hubtel', async (req: Request, res: Response) => {
  try {
    console.log('[Hubtel Webhook Received]', JSON.stringify(req.body));
    const { ClientReference, Status, Amount, TransactionId } = req.body.Data || req.body;

    if (!ClientReference) {
      res.status(400).json({ success: false, message: 'Missing ClientReference' });
      return;
    }

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionRef: ClientReference },
      include: { patient: true },
    });

    if (!transaction) {
      console.warn(`[Hubtel Webhook] Transaction with ref ${ClientReference} not found.`);
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    const isSuccess = Status === 'Success' || Status === 'PAID';

    if (isSuccess) {
      const now = new Date();
      const nextBillingDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days

      await prisma.$transaction(async (tx) => {
        // Update transaction status
        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: PaymentStatus.SUCCESS,
            hubtelTransactionId: TransactionId || undefined,
            rawResponse: req.body,
          },
        });

        // Update subscription to ACTIVE
        await tx.subscription.upsert({
          where: { patientId: transaction.patientId },
          create: {
            patientId: transaction.patientId,
            status: SubscriptionStatus.ACTIVE,
            trialStartsAt: now,
            trialEndsAt: now,
            lastBilledAt: now,
            nextBillingDue,
            amountGhs: 10.0,
          },
          update: {
            status: SubscriptionStatus.ACTIVE,
            lastBilledAt: now,
            nextBillingDue,
          },
        });
      });

      // Send push notification confirmation to patient
      if (transaction.patient.fcmToken) {
        await sendPushNotification(
          transaction.patient.fcmToken,
          'Subscription Activated!',
          'Your 10 GHS monthly TeleDoc subscription is now active. Enjoy full teleconsultation access!'
        );
      }
    } else {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PaymentStatus.FAILED,
          rawResponse: req.body,
        },
      });
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('[Hubtel Webhook Error]', error);
    res.status(500).json({ success: false, message: 'Internal server error processing webhook' });
  }
});

/**
 * Verify Transaction Status
 */
router.get('/verify-transaction/:clientReference', authenticateToken, async (req: Request, res: Response) => {
  try {
    const clientReference = String(req.params.clientReference);

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionRef: clientReference },
    });

    if (!transaction) {
      res.status(404).json({ success: false, message: 'Transaction not found.' });
      return;
    }

    // If still pending, attempt live verification from Hubtel
    if (transaction.status === PaymentStatus.PENDING) {
      const liveCheck = await HubtelPaymentService.verifyTransaction(clientReference);
      if (liveCheck.status === 'PAID') {
        const now = new Date();
        const nextBillingDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await prisma.$transaction([
          prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: PaymentStatus.SUCCESS, hubtelTransactionId: liveCheck.transactionId },
          }),
          prisma.subscription.upsert({
            where: { patientId: transaction.patientId },
            create: {
              patientId: transaction.patientId,
              status: SubscriptionStatus.ACTIVE,
              trialStartsAt: now,
              trialEndsAt: now,
              lastBilledAt: now,
              nextBillingDue,
            },
            update: {
              status: SubscriptionStatus.ACTIVE,
              lastBilledAt: now,
              nextBillingDue,
            },
          }),
        ]);

        res.json({
          success: true,
          status: 'SUCCESS',
          message: 'Payment verified successfully! Subscription activated.',
        });
        return;
      }
    }

    res.json({
      success: true,
      status: transaction.status,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify transaction.' });
  }
});

export default router;
