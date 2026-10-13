import { prisma } from '../../lib/prisma.js';
import { AvailabilitySlot, BookingStatus } from '@pawnest/shared';
import { NotFoundError } from '../../lib/errors.js';

/**
 * Converts a localized date string (YYYY-MM-DD) and time string (HH:mm)
 * in a given IANA timezone (or UTC) into a UTC Date.
 */
export function localizedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // Guess UTC first
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(utcGuess);
    const partMap: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== 'literal') {
        partMap[part.type] = Number(part.value);
      }
    }

    // Adjust for difference
    const tzHour = partMap.hour === 24 ? 0 : partMap.hour;
    const diffMs =
      Date.UTC(partMap.year, partMap.month - 1, partMap.day, tzHour, partMap.minute, partMap.second) -
      utcGuess.getTime();

    return new Date(utcGuess.getTime() - diffMs);
  } catch {
    // Fallback to UTC
    return utcGuess;
  }
}

/**
 * Returns the weekday (0=Sunday..6=Saturday) for a YYYY-MM-DD in the given timezone.
 */
export function getWeekdayInTimezone(dateStr: string, timeZone: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'narrow',
    });
    // In JS Date, getUTCDay() for noonUtc:
    // Let's use numeric weekday:
    const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    const dayStr = weekdayFormatter.format(noonUtc);
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return dayMap[dayStr] ?? noonUtc.getUTCDay();
  } catch {
    return noonUtc.getUTCDay();
  }
}

export interface ComputeSlotsOptions {
  providerId: string;
  serviceId: string;
  dateStr: string; // YYYY-MM-DD
  petId?: string;
  currentTime?: Date;
  minLeadMinutes?: number;
}

export class AvailabilityService {
  async computeSlots(options: ComputeSlotsOptions): Promise<AvailabilitySlot[]> {
    const {
      providerId,
      serviceId,
      dateStr,
      petId,
      currentTime = new Date(),
      minLeadMinutes = 120,
    } = options;

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        hours: true,
      },
    });

    if (!provider || !provider.isActive) {
      throw new NotFoundError('Provider not found or inactive');
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, providerId, isActive: true },
    });

    if (!service) {
      throw new NotFoundError('Service not found or inactive');
    }

    const timeZone = provider.timezone || 'UTC';
    const weekday = getWeekdayInTimezone(dateStr, timeZone);

    // Find provider hours for this weekday
    const dayHours = provider.hours.filter((h) => h.weekday === weekday);
    if (!dayHours.length) {
      return [];
    }

    // Determine day start and end in UTC for query
    const dayStartUtc = localizedTimeToUtc(dateStr, '00:00', timeZone);
    const dayEndUtc = localizedTimeToUtc(dateStr, '23:59', timeZone);

    // Fetch existing active bookings for this provider on this day
    const existingBookings = await prisma.booking.findMany({
      where: {
        providerId,
        status: { not: BookingStatus.CANCELLED },
        startsAt: { lt: dayEndUtc },
        endsAt: { gt: dayStartUtc },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        petId: true,
      },
    });

    const leadCutoffMs = currentTime.getTime() + minLeadMinutes * 60 * 1000;
    const slots: AvailabilitySlot[] = [];

    const durationMin = service.durationMin;
    const bufferMin = service.bufferMin ?? 10;
    const stepMin = durationMin + bufferMin;

    for (const schedule of dayHours) {
      const [openH, openM] = schedule.opensAt.split(':').map(Number);
      const [closeH, closeM] = schedule.closesAt.split(':').map(Number);

      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;
      const stations = schedule.stations;

      for (let m = openMinutes; m + durationMin <= closeMinutes; m += stepMin) {
        const slotStartStr = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const slotEndMinutes = m + durationMin;
        const slotEndStr = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, '0')}:${String(slotEndMinutes % 60).padStart(2, '0')}`;

        const slotStartUtc = localizedTimeToUtc(dateStr, slotStartStr, timeZone);
        const slotEndUtc = localizedTimeToUtc(dateStr, slotEndStr, timeZone);

        // Check if slot starts before min lead time
        if (slotStartUtc.getTime() < leadCutoffMs) {
          continue;
        }

        // Check overlap with existing bookings
        let overlappingCount = 0;
        let petAlreadyBooked = false;

        for (const b of existingBookings) {
          const bookingStart = b.startsAt.getTime();
          const bookingEnd = b.endsAt.getTime();

          const hasOverlap = bookingStart < slotEndUtc.getTime() && bookingEnd > slotStartUtc.getTime();
          if (hasOverlap) {
            overlappingCount++;
            if (petId && b.petId === petId) {
              petAlreadyBooked = true;
            }
          }
        }

        if (petAlreadyBooked) {
          continue;
        }

        const remaining = stations - overlappingCount;
        if (remaining > 0) {
          slots.push({
            startsAt: slotStartUtc.toISOString(),
            endsAt: slotEndUtc.toISOString(),
            remaining,
          });
        }
      }
    }

    return slots;
  }
}

export const availabilityService = new AvailabilityService();
