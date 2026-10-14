import { PgBoss } from 'pg-boss';
import { prisma } from '../lib/prisma.js';
import { mailProvider } from '../integrations/mail/mail.js';

let bossInstance: PgBoss | null = null;
let isStarted = false;
const QUEUE_NAME = 'appointment-reminders';

export function getBoss(): PgBoss {
  if (!bossInstance) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://pawnest:pawnest_dev_password@localhost:5432/pawnest';
    bossInstance = new PgBoss(connectionString);
  }
  return bossInstance;
}

export async function initBoss(): Promise<PgBoss> {
  const boss = getBoss();
  if (!isStarted) {
    await boss.start();
    isStarted = true;

    try {
      await boss.createQueue(QUEUE_NAME);
    } catch (err: any) {
      // Queue may already exist
    }

    await boss.work(QUEUE_NAME, async (jobs) => {
      // pg-boss can pass an array of jobs or single job depending on batching
      const jobList = Array.isArray(jobs) ? jobs : [jobs];
      for (const job of jobList) {
        const { bookingId } = job.data as { bookingId: string };
        if (bookingId) {
          await processAppointmentReminder(bookingId);
        }
      }
    });
  }

  return boss;
}

export async function stopBoss(): Promise<void> {
  if (bossInstance && isStarted) {
    await bossInstance.stop({ graceful: true, timeout: 2000 }).catch(() => {});
    bossInstance = null;
    isStarted = false;
  }
}

/**
 * Schedules a reminder job 24 hours before the appointment startsAt.
 * If 24 hours before is in the past, schedules immediately (0 seconds).
 */
export async function scheduleAppointmentReminder(booking: {
  id: string;
  startsAt: Date | string;
}): Promise<string | null> {
  const boss = await initBoss();
  const startsAtTime = new Date(booking.startsAt).getTime();
  const now = Date.now();
  const targetReminderTime = startsAtTime - 24 * 60 * 60 * 1000;

  const delaySeconds = targetReminderTime > now ? Math.floor((targetReminderTime - now) / 1000) : 0;

  try {
    const jobId = await boss.send(
      QUEUE_NAME,
      { bookingId: booking.id },
      { startAfter: delaySeconds, singletonKey: `remind-${booking.id}` }
    );

    if (jobId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderJobId: jobId },
      });
    }

    return jobId;
  } catch (err) {
    console.error(`Failed to schedule reminder for booking ${booking.id}:`, err);
    return null;
  }
}

/**
 * Idempotently processes an appointment reminder.
 * Guarantees that reminders are delivered EXACTLY ONCE.
 */
export async function processAppointmentReminder(bookingId: string): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        pet: true,
        provider: true,
        service: true,
        user: true,
      },
    });

    if (!booking) return false;

    // Do not send reminders for cancelled bookings
    if (booking.status === 'CANCELLED') {
      return false;
    }

    // Exactly-once delivery guard: if reminder already sent, abort
    if (booking.reminderSentAt) {
      return false;
    }

    // Check if an in-app notification already exists for this booking
    const existingNotification = await tx.notification.findFirst({
      where: {
        userId: booking.userId,
        type: 'APPOINTMENT_REMINDER',
        linkUrl: `/dashboard/bookings/${booking.id}`,
      },
    });

    if (existingNotification) {
      // Mark as sent and skip duplication
      await tx.booking.update({
        where: { id: bookingId },
        data: { reminderSentAt: new Date() },
      });
      return false;
    }

    // 1. Mark reminder as sent atomically
    await tx.booking.update({
      where: { id: bookingId },
      data: { reminderSentAt: new Date() },
    });

    const appointmentTime = new Date(booking.startsAt).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: booking.provider.timezone || 'America/New_York',
    });

    const serviceLabel = booking.service?.name || booking.visitType || 'Veterinary Visit';

    // 2. Create in-app notification
    await tx.notification.create({
      data: {
        userId: booking.userId,
        type: 'APPOINTMENT_REMINDER',
        title: `Appointment Reminder: ${booking.pet.name}`,
        body: `Reminder: ${booking.pet.name} has an upcoming ${serviceLabel} appointment at ${booking.provider.name} on ${appointmentTime}.`,
        linkUrl: `/dashboard/bookings/${booking.id}`,
      },
    });

    // 3. Send email notification (or console log in dev)
    try {
      await mailProvider.send({
        to: booking.user.email,
        subject: `Reminder: ${booking.pet.name}'s appointment tomorrow at ${booking.provider.name}`,
        text: `Hi ${booking.user.name},\n\nThis is a reminder that ${booking.pet.name} has an appointment for ${serviceLabel} at ${booking.provider.name} scheduled for ${appointmentTime}.\n\nLocation: ${booking.provider.addressLine}, ${booking.provider.city}\nReference: ${booking.reference}\n\nView details: ${process.env.WEB_ORIGIN || 'http://localhost:3000'}/dashboard/bookings/${booking.id}\n\nThank you,\nThe PawNest Care Team`,
      });
    } catch (mailErr) {
      console.warn('Failed to send reminder email (logged only):', mailErr);
    }

    return true;
  });
}
