import { Request, Response, NextFunction } from 'express';
import { UserRole, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  // Non-patient roles bypass the subscription paywall
  if (req.user.role !== UserRole.PATIENT) {
    next();
    return;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { patientId: req.user.id },
  });

  const now = new Date();

  // If no subscription record found, create default 90-day trial automatically
  if (!subscription) {
    const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    await prisma.subscription.create({
      data: {
        patientId: req.user.id,
        status: SubscriptionStatus.TRIAL,
        trialStartsAt: now,
        trialEndsAt,
      },
    });
    next();
    return;
  }

  // Case 1: Active within 90-day Free Trial
  if (subscription.status === SubscriptionStatus.TRIAL) {
    if (now <= subscription.trialEndsAt) {
      next();
      return;
    } else {
      // Trial has expired! Update status to EXPIRED
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
      res.status(402).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your 90-day free trial has expired. Please subscribe for 10 GHS / month via Mobile Money or Card to continue booking consultations.',
        trialEndsAt: subscription.trialEndsAt,
        amountDueGhs: 10.0,
      });
      return;
    }
  }

  // Case 2: Paid Subscription
  if (subscription.status === SubscriptionStatus.ACTIVE) {
    if (subscription.nextBillingDue && now > subscription.nextBillingDue) {
      // Past due
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
      res.status(402).json({
        success: false,
        code: 'SUBSCRIPTION_RENEWAL_REQUIRED',
        message: 'Your monthly 10 GHS subscription is due for renewal. Please renew to book new appointments.',
        amountDueGhs: 10.0,
      });
      return;
    }
    next();
    return;
  }

  // Case 3: Expired or unhandled status
  res.status(402).json({
    success: false,
    code: 'SUBSCRIPTION_REQUIRED',
    message: 'An active subscription (10 GHS / month) is required to access booking features.',
    amountDueGhs: 10.0,
  });
}
